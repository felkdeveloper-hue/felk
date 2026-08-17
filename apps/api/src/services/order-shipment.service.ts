import { Types } from 'mongoose';
import { OrderModel, type OrderDocument } from '@/models/order.models.js';
import { ORDER_STATUS, type OrderStatus } from '@/constants/order-status.js';
import { ORDER_AUDIT } from '@/constants/order.js';
import { fedClient } from '@/services/couriers/fed.client.js';
import {
  FULFILLMENT_PIPELINE,
  mapFedStatusToOrderStatus,
} from '@/services/couriers/fed-status-map.js';
import type {
  FedShipmentMetadata,
  FedTrackingMetadata,
} from '@/services/couriers/fed.types.js';
import { orderService } from '@/services/order.service.js';
import { recordOrderTimeline } from '@/services/order-timeline.service.js';
import { writeAuditLog } from '@/services/audit.service.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import type { AuthenticatedUser } from '@/types/index.js';
import { HTTP_STATUS } from '@/constants/http.js';
import { ApiError } from '@/utils/errors/api-error.js';

const FED_TRACKING_BASE = 'https://www.fdedomestic.com/client/all_parcel.php';

export interface CreateFedShipmentInput {
  mode?: 'new' | 'existing';
  waybillId?: string;
  parcelWeightKg?: number;
  parcelDescription?: string;
  amount?: number;
  exchange?: boolean;
}

function readShipmentMetadata(metadata: Record<string, unknown>): FedShipmentMetadata | null {
  const shipment = metadata.shipment;
  if (!shipment || typeof shipment !== 'object') return null;
  const record = shipment as FedShipmentMetadata;
  return record.waybillNo ? record : null;
}

function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length >= 11) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function buildParcelDescription(order: OrderDocument, override?: string): string {
  if (override?.trim()) return override.trim().slice(0, 200);
  const names = order.items.map((item) => item.name).filter(Boolean);
  if (names.length > 0) {
    return names.join(', ').slice(0, 200);
  }
  return `FE order ${order.orderNumber}`.slice(0, 200);
}

function resolveCodAmount(order: OrderDocument, override?: number): number {
  if (typeof override === 'number' && override >= 0) return Math.round(override);
  const method = String(order.paymentMethod ?? '').toLowerCase();
  if (method === 'cod') return Math.round(order.totals.grandTotal);
  return 0;
}

function resolveWeightKg(order: OrderDocument, override?: number): number {
  if (typeof override === 'number' && override > 0) return override;
  const grams = order.totals.totalWeightGrams ?? 0;
  const kg = grams > 0 ? grams / 1000 : 1;
  return Math.max(1, Math.round(kg * 100) / 100);
}

function buildAddressLine(order: OrderDocument): string {
  const address = (order.shippingAddress ?? {}) as Record<string, string | null | undefined>;
  return [address.line1, address.line2].filter(Boolean).join(', ').slice(0, 250);
}

function buildTrackingMetadata(waybillNo: string, fedStatus?: string, updatedAt?: string): {
  shipment: FedShipmentMetadata;
  tracking: FedTrackingMetadata;
} {
  const at = updatedAt ?? new Date().toISOString();
  const shipment: FedShipmentMetadata = {
    carrier: 'FED',
    waybillNo,
    fedStatus,
    fedStatusUpdatedAt: fedStatus ? at : undefined,
    createdAt: at,
    mode: 'new',
    statusHistory: fedStatus ? [{ status: fedStatus, at }] : [],
  };

  const tracking: FedTrackingMetadata = {
    carrier: 'FED',
    trackingNumber: waybillNo,
    trackingUrl: FED_TRACKING_BASE,
    lastCourierStatus: fedStatus,
    lastCourierUpdateAt: fedStatus ? at : undefined,
  };

  return { shipment, tracking };
}

export class OrderShipmentService {
  private async findOrderById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Order not found');
    const order = await OrderModel.findOne({ _id: id, isDeleted: false });
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  private async findOrderByWaybill(waybillId: string): Promise<OrderDocument | null> {
    return OrderModel.findOne({
      isDeleted: false,
      $or: [
        { 'metadata.shipment.waybillNo': waybillId },
        { 'metadata.tracking.trackingNumber': waybillId },
      ],
    });
  }

  async createFedShipment(
    orderId: string,
    input: CreateFedShipmentInput,
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    if (!fedClient.isConfigured()) {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'FED courier integration is not configured on the server',
        'FED_NOT_CONFIGURED',
      );
    }

    const order = await this.findOrderById(orderId);
    const existing = readShipmentMetadata(order.metadata ?? {});
    if (existing?.waybillNo) {
      throw ApiError.conflict(
        `This order already has FED waybill ${existing.waybillNo}`,
        { waybillNo: existing.waybillNo },
        'FED_WAYBILL_EXISTS',
      );
    }

    const shipping = (order.shippingAddress ?? {}) as Record<string, string | null | undefined>;
    const recipientName = String(shipping.fullName ?? '').trim();
    const recipientPhone = normalizePhone(shipping.phone);
    const recipientAddress = buildAddressLine(order);
    const recipientCity = String(shipping.city ?? '').trim();

    if (!recipientName) throw ApiError.badRequest('Shipping address is missing recipient name');
    if (!recipientPhone || recipientPhone.length < 9) {
      throw ApiError.badRequest('Shipping address needs a valid recipient phone number');
    }
    if (!recipientAddress) throw ApiError.badRequest('Shipping address line is required');
    if (!recipientCity) throw ApiError.badRequest('Shipping city is required');

    const mode = input.mode ?? 'new';
    const parcelWeight = String(resolveWeightKg(order, input.parcelWeightKg));
    const parcelDescription = buildParcelDescription(order, input.parcelDescription);
    const amount = String(resolveCodAmount(order, input.amount));
    const exchange = input.exchange ? '1' : '0';

    const payload = {
      order_id: order.orderNumber,
      parcel_weight: parcelWeight,
      parcel_description: parcelDescription,
      recipient_name: recipientName,
      recipient_contact_1: recipientPhone,
      recipient_address: recipientAddress,
      recipient_city: recipientCity,
      amount,
      exchange: exchange as '0' | '1',
    };

    const waybillNo =
      mode === 'existing'
        ? await fedClient.createExistingWaybill({
            ...payload,
            waybill_id: String(input.waybillId ?? '').trim(),
          })
        : await fedClient.createNewWaybill(payload);

    const createdAt = new Date().toISOString();
    const { shipment, tracking } = buildTrackingMetadata(waybillNo);
    shipment.mode = mode;
    shipment.createdAt = createdAt;

    order.metadata = {
      ...(order.metadata ?? {}),
      shipment,
      tracking,
    };
    order.version += 1;
    await order.save();

    await writeAuditLog({
      action: ORDER_AUDIT.FED_SHIPMENT_CREATED,
      resourceType: 'orders',
      resourceId: order._id.toString(),
      actorUserId: user.id,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { waybillNo, mode, orderNumber: order.orderNumber },
    });

    await recordOrderTimeline({
      orderId: order._id.toString(),
      event: 'fed_shipment_created',
      status: order.status,
      note: `FED waybill ${waybillNo} created`,
      actorUserId: user.id,
      actorType: 'user',
    });

    if (order.status === ORDER_STATUS.CONFIRMED || order.status === ORDER_STATUS.PACKED) {
      await orderService.syncStatusFromCourier(
        order._id.toString(),
        ORDER_STATUS.READY_FOR_SHIPMENT,
        `FED waybill ${waybillNo} created`,
      );
    }

    return orderService.getById(orderId, user);
  }

  async handleFedWebhook(body: Record<string, unknown>) {
    const waybillId = String(body.waybill_id ?? '').trim();
    const deliveryStatus = String(
      body.delivery_status ?? body.current_status ?? '',
    ).trim();
    const lastUpdateTime = String(body.last_update_time ?? '').trim() || new Date().toISOString();

    if (!waybillId) {
      return { ok: false, reason: 'missing_waybill_id' as const };
    }

    const order = await this.findOrderByWaybill(waybillId);
    if (!order) {
      return { ok: false, reason: 'order_not_found' as const, waybillId };
    }

    const metadata = { ...(order.metadata ?? {}) } as Record<string, unknown>;
    const shipment = (metadata.shipment as FedShipmentMetadata | undefined) ?? {
      carrier: 'FED' as const,
      waybillNo: waybillId,
      createdAt: new Date().toISOString(),
      mode: 'new' as const,
      statusHistory: [],
    };

    shipment.fedStatus = deliveryStatus || shipment.fedStatus;
    shipment.fedStatusUpdatedAt = lastUpdateTime;
    shipment.statusHistory = [
      ...(shipment.statusHistory ?? []),
      { status: deliveryStatus || 'unknown', at: lastUpdateTime },
    ];

    const tracking = (metadata.tracking as FedTrackingMetadata | undefined) ?? {
      carrier: 'FED' as const,
      trackingNumber: waybillId,
      trackingUrl: FED_TRACKING_BASE,
    };
    tracking.lastCourierStatus = deliveryStatus || tracking.lastCourierStatus;
    tracking.lastCourierUpdateAt = lastUpdateTime;

    metadata.shipment = shipment;
    metadata.tracking = tracking;
    order.metadata = metadata;
    order.version += 1;
    await order.save();

    await recordOrderTimeline({
      orderId: order._id.toString(),
      event: 'fed_status_update',
      status: order.status,
      note: deliveryStatus
        ? `FED status: ${deliveryStatus}`
        : `FED waybill ${waybillId} updated`,
      actorType: 'system',
    });

    const targetStatus = deliveryStatus ? mapFedStatusToOrderStatus(deliveryStatus) : null;
    if (targetStatus) {
      await orderService.syncStatusFromCourier(
        order._id.toString(),
        targetStatus,
        `FED: ${deliveryStatus}`,
      );
    }

    return {
      ok: true,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      waybillId,
      deliveryStatus,
    };
  }
}

export const orderShipmentService = new OrderShipmentService();
