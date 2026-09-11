/**
 * Staff Excel export of orders. "Received At" is when the customer paid /
 * placed the order (Sri Lanka local time) — never a fulfillment timestamp.
 */
import ExcelJS from 'exceljs';
import { CustomerModel } from '@/models/customer.models.js';
import { orderService } from '@/services/order.service.js';
import { formatReceivedAtTimestamp } from '@/utils/order-received-at.js';
import type { AuthenticatedUser } from '@/types/index.js';

const MAX_EXPORT_ROWS = 5000;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_shipment: 'Ready for shipment',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
};

export interface OrderExportFilters {
  status?: string;
  customerId?: string;
  q?: string;
}

type AddressLike = {
  fullName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type ExportOrder = {
  orderNumber: string;
  status: string;
  customerId: string;
  receivedAt?: Date | string | null;
  paidAt?: Date | string | null;
  placedAt?: Date | string | null;
  createdAt?: Date | string | null;
  shippingAddress?: AddressLike | null;
  shippingMethod?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  currency: string;
  totals?: {
    subtotal?: number;
    shipping?: number;
    discount?: number;
    grandTotal?: number;
    totalQuantity?: number;
  };
  items?: Array<{
    name?: string;
    variantTitle?: string | null;
    sku?: string;
    quantity?: number;
  }>;
  source?: { label?: string; channel?: string; detail?: string | null };
};

function pretty(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAddress(address?: AddressLike | null): string {
  if (!address) return '';
  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function formatProducts(
  items: Array<{ name?: string; variantTitle?: string | null; sku?: string; quantity?: number }>,
): string {
  return items
    .map((item) => {
      const title = [item.name, item.variantTitle].filter(Boolean).join(' / ');
      const sku = item.sku ? ` [${item.sku}]` : '';
      return `${title}${sku} × ${item.quantity ?? 1}`;
    })
    .join('; ');
}

export class OrderExportService {
  async exportWorkbook(filters: OrderExportFilters, user: AuthenticatedUser): Promise<Buffer> {
    const orders = (await orderService.listForExport(
      filters,
      user,
      MAX_EXPORT_ROWS,
    )) as ExportOrder[];

    const customerIds = [...new Set(orders.map((order) => order.customerId).filter(Boolean))];
    const customers = await CustomerModel.find({ _id: { $in: customerIds } })
      .select('email')
      .lean();
    const emailByCustomer = new Map(
      customers.map((customer) => [String(customer._id), String(customer.email ?? '')]),
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FE Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Orders', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = [
      { header: 'Order Number', key: 'orderNumber', width: 24 },
      { header: 'Received At', key: 'receivedAt', width: 22 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Ship To', key: 'shipTo', width: 40 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Source Channel', key: 'sourceChannel', width: 22 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Payment Reference', key: 'paymentReference', width: 22 },
      { header: 'Shipping Method', key: 'shippingMethod', width: 18 },
      { header: 'Items', key: 'items', width: 10 },
      { header: 'Products', key: 'products', width: 48 },
      { header: 'Subtotal', key: 'subtotal', width: 14 },
      { header: 'Shipping', key: 'shipping', width: 12 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Grand Total', key: 'grandTotal', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
    ];
    sheet.columns = columns;

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    header.commit();

    for (const order of orders) {
      const address = order.shippingAddress;
      const totals = order.totals ?? {};
      sheet.addRow({
        orderNumber: order.orderNumber,
        receivedAt: formatReceivedAtTimestamp(
          order.receivedAt ?? order.paidAt ?? order.placedAt ?? order.createdAt,
        ),
        status: STATUS_LABELS[order.status] ?? pretty(order.status),
        customer: address?.fullName ?? '',
        phone: address?.phone ?? '',
        email: emailByCustomer.get(order.customerId) ?? '',
        shipTo: formatAddress(address),
        source: order.source?.label ?? '',
        sourceChannel: order.source?.detail || order.source?.channel || '',
        paymentMethod: pretty(order.paymentMethod),
        paymentReference: order.paymentReference ?? '',
        shippingMethod: pretty(order.shippingMethod),
        items: Number(totals.totalQuantity ?? order.items?.length ?? 0),
        products: formatProducts(order.items ?? []),
        subtotal: Number(totals.subtotal ?? 0),
        shipping: Number(totals.shipping ?? 0),
        discount: Number(totals.discount ?? 0),
        grandTotal: Number(totals.grandTotal ?? 0),
        currency: order.currency ?? 'LKR',
      });
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const orderExportService = new OrderExportService();
