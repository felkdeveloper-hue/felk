import { Schema, model, type Document } from 'mongoose';

export interface MetaAdsSyncStateDocument extends Document {
  accountId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  lastError: string | null;
  lastSyncedFrom: string | null; // YYYY-MM-DD
  lastSyncedTo: string | null;
  rowsUpserted: number;
}

const metaAdsSyncStateSchema = new Schema<MetaAdsSyncStateDocument>(
  {
    accountId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['idle', 'running', 'success', 'error'],
      default: 'idle',
    },
    lastSuccessAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    lastSyncedFrom: { type: String, default: null },
    lastSyncedTo: { type: String, default: null },
    rowsUpserted: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'pa_meta_ads_sync_state' },
);

export const MetaAdsSyncStateModel = model<MetaAdsSyncStateDocument>(
  'PaMetaAdsSyncState',
  metaAdsSyncStateSchema,
);
