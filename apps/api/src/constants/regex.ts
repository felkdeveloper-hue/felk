export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  E164_PHONE: /^\+[1-9]\d{7,14}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  OBJECT_ID: /^[a-f\d]{24}$/i,
  SKU: /^[A-Z0-9][A-Z0-9\-_]{2,64}$/i,
  OTP: /^\d{4,8}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;
