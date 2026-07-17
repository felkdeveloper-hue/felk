import { ShippingZoneModel, TaxConfigModel } from '@/models/settings.models';
import { SHIPPING_METHOD, type ShippingMethod } from '@/constants/checkout';

export interface ShippingCalcInput {
  country?: string | null;
  state?: string | null;
  subtotal: number;
  totalWeightGrams: number;
  method: ShippingMethod;
  currency: string;
}

export interface ShippingCalcResult {
  status: 'calculated' | 'placeholder' | 'unavailable';
  method: string;
  amount: number;
  currency: string;
  zoneId?: string | null;
  zoneName?: string | null;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  message: string;
  carrier: string;
}

export interface TaxCalcInput {
  country?: string | null;
  state?: string | null;
  subtotal: number;
  shipping: number;
  currency: string;
}

export interface TaxCalcResult {
  status: 'calculated' | 'placeholder' | 'unavailable';
  amount: number;
  ratePercent: number;
  taxConfigId?: string | null;
  taxClass?: string | null;
  country?: string | null;
  province?: string | null;
  isInclusive: boolean;
  message: string;
  provider: string;
}

/**
 * Shipping calculator structure — uses CMS shipping zones when available.
 * Carrier integrations are future work.
 */
export async function calculateShipping(input: ShippingCalcInput): Promise<ShippingCalcResult> {
  if (input.method === SHIPPING_METHOD.PICKUP) {
    return {
      status: 'calculated',
      method: SHIPPING_METHOD.PICKUP,
      amount: 0,
      currency: input.currency,
      message: 'Store pickup — no shipping charge',
      carrier: 'pickup',
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
    };
  }

  if (input.method === SHIPPING_METHOD.FREE) {
    return {
      status: 'calculated',
      method: SHIPPING_METHOD.FREE,
      amount: 0,
      currency: input.currency,
      message: 'Free shipping applied (structure)',
      carrier: 'internal',
    };
  }

  const country = input.country?.toUpperCase();
  const zones = await ShippingZoneModel.find({
    isDeleted: false,
    status: 'active',
    ...(country ? { countries: country } : {}),
  }).lean();

  const zone =
    zones.find((z) =>
      input.state
        ? (z.regions ?? []).map((r: string) => r.toLowerCase()).includes(input.state.toLowerCase())
        : true,
    ) ?? zones[0];

  if (!zone) {
    // Structure fallback rates
    const amount = input.method === SHIPPING_METHOD.EXPRESS ? 800 : 400;
    return {
      status: 'placeholder',
      method: input.method,
      amount,
      currency: input.currency,
      message: 'No shipping zone matched — using fallback rate (carrier integrations pending)',
      carrier: 'placeholder',
      estimatedDaysMin: input.method === SHIPPING_METHOD.EXPRESS ? 1 : 3,
      estimatedDaysMax: input.method === SHIPPING_METHOD.EXPRESS ? 2 : 7,
    };
  }

  let amount = 0;
  if (zone.rateType === 'free') {
    amount = 0;
  } else if (zone.rateType === 'weight') {
    const kg = Math.max(0.1, input.totalWeightGrams / 1000);
    amount = Number((zone.rate * kg).toFixed(2));
  } else {
    amount = zone.rate;
  }

  if (input.method === SHIPPING_METHOD.EXPRESS) {
    amount = Number((amount * 1.75).toFixed(2));
  }

  if (
    zone.minOrderAmount != null &&
    input.subtotal >= zone.minOrderAmount &&
    zone.rateType !== 'free'
  ) {
    // optional free threshold structure
  }

  return {
    status: 'calculated',
    method: input.method,
    amount,
    currency: zone.currency || input.currency,
    zoneId: zone._id.toString(),
    zoneName: zone.name,
    estimatedDaysMin: zone.estimatedDaysMin,
    estimatedDaysMax: zone.estimatedDaysMax,
    message: `Shipping via zone ${zone.name}`,
    carrier: 'internal',
  };
}

/**
 * Tax calculator structure — uses CMS tax configs when available.
 * Future: Avalara / TaxJar providers.
 */
export async function calculateTax(input: TaxCalcInput): Promise<TaxCalcResult> {
  const country = input.country?.toUpperCase() ?? null;
  const region = input.state ?? null;

  const configs = await TaxConfigModel.find({
    isDeleted: false,
    status: 'active',
  }).lean();

  const match =
    configs.find(
      (c) =>
        (!c.country || c.country.toUpperCase() === country) &&
        (!c.region || !region || c.region.toLowerCase() === region.toLowerCase()),
    ) ?? configs.find((c) => !c.country);

  if (!match) {
    return {
      status: 'placeholder',
      amount: 0,
      ratePercent: 0,
      country,
      province: region,
      isInclusive: false,
      message: 'No tax config found — placeholder zero tax (provider integrations pending)',
      provider: 'placeholder',
    };
  }

  const taxable = match.isInclusive ? input.subtotal : input.subtotal + input.shipping;
  const amount = Number(((taxable * match.ratePercent) / 100).toFixed(2));

  return {
    status: 'calculated',
    amount: match.isInclusive ? 0 : amount,
    ratePercent: match.ratePercent,
    taxConfigId: match._id.toString(),
    taxClass: match.code,
    country: match.country ?? country,
    province: match.region ?? region,
    isInclusive: match.isInclusive,
    message: `Tax via ${match.name} (${match.ratePercent}%)`,
    provider: 'internal',
  };
}

/** Coupon integration placeholder. */
export function applyCouponPlaceholder(code?: string | null) {
  return {
    status: 'placeholder' as const,
    code: code ?? null,
    amount: 0,
    message: code
      ? `Coupon "${code}" accepted as placeholder — rules not applied yet`
      : 'Coupon engine reserved for future phase',
  };
}

/** Gift card integration placeholder. */
export function applyGiftCardPlaceholder(code?: string | null) {
  return {
    status: 'placeholder' as const,
    code: code ?? null,
    amount: 0,
    message: code
      ? `Gift card "${code}" accepted as placeholder — redemption not applied yet`
      : 'Gift card engine reserved for future phase',
  };
}
