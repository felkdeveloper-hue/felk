import { Schema, model, type Document, type Types } from 'mongoose';

export interface DashboardWidgetSettings {
  period?: string;
  chartType?: string;
  metric?: string;
  refreshInterval?: number;
  displayMode?: string;
  [key: string]: unknown;
}

export interface DashboardWidgetPlacement {
  /** Unique instance id within the layout */
  i: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  hidden?: boolean;
  collapsed?: boolean;
  pinned?: boolean;
  settings?: DashboardWidgetSettings;
}

export interface DashboardLayoutSnapshot {
  widgets: DashboardWidgetPlacement[];
  theme?: Record<string, unknown>;
  updatedAt?: Date;
}

export interface DashboardLayoutDocument extends Document {
  userId: Types.ObjectId;
  activeKey: string;
  /** Named layouts: personal + any applied templates */
  layouts: Map<string, DashboardLayoutSnapshot> | Record<string, DashboardLayoutSnapshot>;
  roleDefaultApplied?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const placementSchema = new Schema<DashboardWidgetPlacement>(
  {
    i: { type: String, required: true },
    widgetId: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
    minW: { type: Number },
    minH: { type: Number },
    maxW: { type: Number },
    maxH: { type: Number },
    hidden: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const snapshotSchema = new Schema<DashboardLayoutSnapshot>(
  {
    widgets: { type: [placementSchema], default: [] },
    theme: { type: Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schema = new Schema<DashboardLayoutDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    activeKey: { type: String, default: 'personal', index: true },
    layouts: { type: Map, of: snapshotSchema, default: () => new Map() },
    roleDefaultApplied: { type: String, default: null },
  },
  { timestamps: true, collection: 'pa_dashboard_layouts' },
);

export const DashboardLayoutModel = model<DashboardLayoutDocument>('PaDashboardLayout', schema);
