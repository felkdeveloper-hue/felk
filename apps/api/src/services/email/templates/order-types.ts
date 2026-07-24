export interface OrderEmailData {
  email: string;
  name: string;
  orderNumber: string;
  total?: number;
  currency?: string;
  orderUrl?: string;
  reason?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  refundAmount?: number;
  invoiceNumber?: string;
}
