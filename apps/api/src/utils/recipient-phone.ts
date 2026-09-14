import { CustomerAddressModel, CustomerModel } from '@/models/customer.models.js';
import { UserModel } from '@/models/user.model.js';

const MIN_DIGITS = 9;

export function normalizeRecipientPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length >= 11) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidRecipientPhone(phone: string | null | undefined): boolean {
  return normalizeRecipientPhone(phone).length >= MIN_DIGITS;
}

export function pickValidRecipientPhoneRaw(
  candidates: Array<string | null | undefined>,
): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (isValidRecipientPhone(trimmed)) return trimmed;
  }
  return null;
}

function readPhone(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const phone = (value as Record<string, unknown>).phone;
  return typeof phone === 'string' ? phone : null;
}

/**
 * Prefer a real mobile number: shipping snapshot → billing → customer profile
 * → saved addresses → login user. Ignores values that are names or too short.
 */
export async function resolveOrderRecipientPhone(order: {
  shippingAddress?: Record<string, unknown> | null;
  billingAddress?: Record<string, unknown> | null;
  customerId: { toString(): string } | string;
}): Promise<string | null> {
  const fromOrder = pickValidRecipientPhoneRaw([
    readPhone(order.shippingAddress),
    readPhone(order.billingAddress),
  ]);
  if (fromOrder) return fromOrder;

  const customerId = String(order.customerId);
  const [customer, addresses] = await Promise.all([
    CustomerModel.findById(customerId).select('phone userId').lean(),
    CustomerAddressModel.find({ customerId, isDeleted: false }).select('phone').lean(),
  ]);

  const fromProfile = pickValidRecipientPhoneRaw([
    customer?.phone,
    ...addresses.map((row) => (typeof row.phone === 'string' ? row.phone : null)),
  ]);
  if (fromProfile) return fromProfile;

  if (!customer?.userId) return null;
  const user = await UserModel.findById(customer.userId).select('phone').lean();
  return pickValidRecipientPhoneRaw([user?.phone]);
}
