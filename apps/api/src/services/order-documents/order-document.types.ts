export interface OrderDocumentBranding {
  storeName: string;
  storeAddress: string;
  storeTagline: string;
}

export interface OrderDocumentAddress {
  fullName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface OrderDocumentLineItem {
  name: string;
  variantTitle?: string | null;
  sku: string;
  quantity: number;
  lineTotal: number;
}

export interface OrderDocumentPayload {
  orderNumber: string;
  invoiceNumber: string;
  issuedAt: Date;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  paymentStatus: string;
  recipient: OrderDocumentAddress;
  items: OrderDocumentLineItem[];
  totals: {
    subtotal: number;
    shipping: number;
    discount: number;
    tax: number;
    grandTotal: number;
    totalWeightGrams?: number;
  };
  branding: OrderDocumentBranding;
}

export const DEFAULT_ORDER_DOCUMENT_BRANDING: OrderDocumentBranding = {
  storeName: 'FASHION EDGE',
  storeAddress: '14A Kotugodella st, Kandy',
  storeTagline: 'CURATED MODERN ESSENTIALS',
};

export function formatOrderDocumentAddress(address: OrderDocumentAddress): string {
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  return lines.join('\n');
}

export function formatCurrencyLkr(amount: number, currency = 'LKR'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency} ${formatted}`;
}

export function formatPaymentMethodLabel(method: string): string {
  const label = method.replace(/_/g, ' ').trim();
  if (label.toLowerCase() === 'cod') return 'Cash on Delivery';
  return label.toUpperCase();
}
