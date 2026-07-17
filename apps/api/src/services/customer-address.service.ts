import { CustomerAddressModel, CustomerModel } from '@/models/customer.models';
import { customerService } from '@/services/customer.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { CUSTOMER_AUDIT } from '@/constants/customer';

export class CustomerAddressService {
  async list(customerId: string) {
    await customerService.getById(customerId);
    return CustomerAddressModel.find({ customerId, isDeleted: false }).sort({
      isDefaultShipping: -1,
      isDefaultBilling: -1,
      updatedAt: -1,
    });
  }

  async getById(customerId: string, addressId: string) {
    const address = await CustomerAddressModel.findOne({
      _id: addressId,
      customerId,
      isDeleted: false,
    });
    if (!address) throw ApiError.notFound('Address not found');
    return address;
  }

  private async clearDefaults(
    customerId: string,
    opts: { shipping?: boolean; billing?: boolean },
    excludeId?: string,
  ) {
    const filter: Record<string, unknown> = {
      customerId,
      isDeleted: false,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    };
    if (opts.shipping) {
      await CustomerAddressModel.updateMany(filter, { $set: { isDefaultShipping: false } });
    }
    if (opts.billing) {
      await CustomerAddressModel.updateMany(filter, { $set: { isDefaultBilling: false } });
    }
  }

  async create(customerId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    await customerService.getById(customerId);

    const isDefaultShipping = Boolean(payload.isDefaultShipping);
    const isDefaultBilling = Boolean(payload.isDefaultBilling);

    if (isDefaultShipping || isDefaultBilling) {
      await this.clearDefaults(customerId, {
        shipping: isDefaultShipping,
        billing: isDefaultBilling,
      });
    }

    const address = await CustomerAddressModel.create({
      customerId,
      type: payload.type ?? 'both',
      label: payload.label ?? 'home',
      fullName: payload.fullName,
      phone: payload.phone,
      line1: payload.line1,
      line2: payload.line2 ?? null,
      city: payload.city,
      state: payload.state ?? null,
      postalCode: payload.postalCode,
      country: String(payload.country).toUpperCase(),
      isDefaultShipping,
      isDefaultBilling,
    });

    const customerUpdates: Record<string, unknown> = {};
    if (isDefaultShipping) customerUpdates.defaultShippingAddressId = address._id;
    if (isDefaultBilling) customerUpdates.defaultBillingAddressId = address._id;
    if (Object.keys(customerUpdates).length) {
      await CustomerModel.updateOne({ _id: customerId }, { $set: customerUpdates });
    }

    await writeAuditLog({
      action: CUSTOMER_AUDIT.ADDRESS_ADDED,
      resourceType: 'customer_addresses',
      resourceId: address._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: address.toObject() as Record<string, unknown>,
      metadata: { customerId },
    });

    return address;
  }

  async update(
    customerId: string,
    addressId: string,
    payload: Record<string, unknown>,
    actor: ActorMeta,
  ) {
    const before = await this.getById(customerId, addressId);

    if (payload.isDefaultShipping === true || payload.isDefaultBilling === true) {
      await this.clearDefaults(
        customerId,
        {
          shipping: payload.isDefaultShipping === true,
          billing: payload.isDefaultBilling === true,
        },
        addressId,
      );
    }

    if (payload.country) payload.country = String(payload.country).toUpperCase();

    const address = await CustomerAddressModel.findOneAndUpdate(
      { _id: addressId, customerId, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    const customerUpdates: Record<string, unknown> = {};
    if (payload.isDefaultShipping === true) {
      customerUpdates.defaultShippingAddressId = addressId;
    }
    if (payload.isDefaultBilling === true) {
      customerUpdates.defaultBillingAddressId = addressId;
    }
    if (Object.keys(customerUpdates).length) {
      await CustomerModel.updateOne({ _id: customerId }, { $set: customerUpdates });
    }

    await writeAuditLog({
      action: 'customers.address_updated',
      resourceType: 'customer_addresses',
      resourceId: addressId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: address?.toObject() as Record<string, unknown>,
    });

    return address;
  }

  async remove(customerId: string, addressId: string, actor: ActorMeta) {
    const before = await this.getById(customerId, addressId);
    const address = await CustomerAddressModel.findOneAndUpdate(
      { _id: addressId, customerId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    const customer = await customerService.getById(customerId);
    const unset: Record<string, unknown> = {};
    if (customer.defaultShippingAddressId?.toString() === addressId) {
      unset.defaultShippingAddressId = null;
    }
    if (customer.defaultBillingAddressId?.toString() === addressId) {
      unset.defaultBillingAddressId = null;
    }
    if (Object.keys(unset).length) {
      await CustomerModel.updateOne({ _id: customerId }, { $set: unset });
    }

    await writeAuditLog({
      action: CUSTOMER_AUDIT.ADDRESS_DELETED,
      resourceType: 'customer_addresses',
      resourceId: addressId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      metadata: { customerId },
    });

    return address;
  }
}

export const customerAddressService = new CustomerAddressService();
