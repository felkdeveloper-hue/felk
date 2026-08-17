export interface FedParcelPayload {
  order_id?: string;
  parcel_weight: string;
  parcel_description: string;
  recipient_name: string;
  recipient_contact_1: string;
  recipient_contact_2?: string;
  recipient_address: string;
  recipient_city: string;
  amount: string;
  exchange: '0' | '1';
  waybill_id?: string;
}

export interface FedApiResponse {
  status: number;
  waybill_no?: string;
}

export interface FedShipmentMetadata {
  carrier: 'FED';
  waybillNo: string;
  fedStatus?: string;
  fedStatusUpdatedAt?: string;
  createdAt: string;
  mode: 'new' | 'existing';
  statusHistory: Array<{
    status: string;
    at: string;
  }>;
}

export interface FedTrackingMetadata {
  carrier: 'FED';
  trackingNumber: string;
  trackingUrl: string;
  lastCourierStatus?: string;
  lastCourierUpdateAt?: string;
}

export const FED_STATUS_MESSAGES: Record<number, string> = {
  200: 'Successful',
  201: 'Inactive client',
  202: 'Invalid order id',
  203: 'Invalid weight',
  204: 'Empty or invalid parcel description',
  205: 'Empty or invalid name',
  206: 'Contact number 1 is not valid',
  207: 'Contact number 2 is not valid',
  208: 'Empty or invalid address',
  209: 'Invalid city',
  210: 'Unsuccessful insert, try again',
  211: 'Invalid API key',
  212: 'Invalid or inactive client',
  213: 'Invalid exchange value',
  214: 'System maintain mode is activated',
  215: 'Invalid contact number 1',
  216: 'Invalid contact number 2',
  217: 'Empty or invalid amount',
  218: 'Parcel insert unsuccessfully',
};
