import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import {
  MOVEMENT_TYPE,
  RESERVATION_STATUS,
  TRANSFER_STATUS,
  PO_STATUS,
  ALERT_TYPE,
  ALERT_STATUS,
  WAREHOUSE_STATUS,
  SUPPLIER_STATUS,
} from '@/constants/inventory';
import { INVENTORY_STATUS } from '@/constants/inventory-status';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

const addressSchema = new Schema(
  {
    line1: { type: String, default: null },
    line2: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postalCode: { type: String, default: null },
    country: { type: String, default: null },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/* Warehouse                                                                   */
/* -------------------------------------------------------------------------- */

export interface WarehouseDocument extends Document {
  name: string;
  code: string;
  address?: Record<string, unknown> | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  managerUserId?: Types.ObjectId | null;
  priority: number;
  timezone: string;
  isDefault: boolean;
  status: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<WarehouseDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    address: { type: addressSchema, default: null },
    contactName: { type: String, default: null },
    contactPhone: { type: String, default: null },
    contactEmail: { type: String, default: null },
    managerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: Number, default: 100, index: true },
    timezone: { type: String, default: 'Asia/Colombo' },
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(WAREHOUSE_STATUS),
      default: WAREHOUSE_STATUS.ACTIVE,
      index: true,
    },
    ...softDelete,
  },
  { timestamps: true, collection: 'warehouses' },
);

warehouseSchema.index({ code: 1 }, { unique: true });
warehouseSchema.index({ name: 'text', code: 'text' });

export const WarehouseModel: Model<WarehouseDocument> = model('Warehouse', warehouseSchema);

/* -------------------------------------------------------------------------- */
/* Inventory item (variant × warehouse)                                        */
/* -------------------------------------------------------------------------- */

export interface InventoryItemDocument extends Document {
  warehouseId: Types.ObjectId;
  variantId: Types.ObjectId;
  productId?: Types.ObjectId | null;
  sku?: string | null;
  available: number;
  reserved: number;
  incoming: number;
  damaged: number;
  returned: number;
  onHand: number;
  safetyStock: number;
  reorderPoint: number;
  maximumStock: number;
  unitCost: number;
  currency: string;
  stockStatus: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<InventoryItemDocument>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    sku: { type: String, default: null, index: true },
    available: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    incoming: { type: Number, default: 0, min: 0 },
    damaged: { type: Number, default: 0, min: 0 },
    returned: { type: Number, default: 0, min: 0 },
    onHand: { type: Number, default: 0, min: 0 },
    safetyStock: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    maximumStock: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'LKR' },
    stockStatus: {
      type: String,
      enum: Object.values(INVENTORY_STATUS),
      default: INVENTORY_STATUS.OUT_OF_STOCK,
      index: true,
    },
    version: { type: Number, default: 1 },
    ...softDelete,
  },
  { timestamps: true, collection: 'inventory_items' },
);

inventoryItemSchema.index({ warehouseId: 1, variantId: 1 }, { unique: true });
inventoryItemSchema.index({ available: 1 });
inventoryItemSchema.index({ stockStatus: 1, available: 1 });

export const InventoryItemModel: Model<InventoryItemDocument> = model(
  'InventoryItem',
  inventoryItemSchema,
);

/* -------------------------------------------------------------------------- */
/* Stock movements (immutable ledger)                                          */
/* -------------------------------------------------------------------------- */

export const StockMovementModel = model(
  'StockMovement',
  new Schema(
    {
      warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
      variantId: {
        type: Schema.Types.ObjectId,
        ref: 'ProductVariant',
        required: true,
        index: true,
      },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      inventoryItemId: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
        index: true,
      },
      type: {
        type: String,
        enum: Object.values(MOVEMENT_TYPE),
        required: true,
        index: true,
      },
      quantity: { type: Number, required: true },
      balanceAfter: {
        type: new Schema(
          {
            onHand: Number,
            available: Number,
            reserved: Number,
            incoming: Number,
            damaged: Number,
            returned: Number,
          },
          { _id: false },
        ),
        required: true,
      },
      unitCost: { type: Number, default: null },
      referenceType: { type: String, default: 'manual', index: true },
      referenceId: { type: Schema.Types.ObjectId, default: null, index: true },
      reason: { type: String, default: null },
      note: { type: String, default: null },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'stock_movements' },
  ),
);

StockMovementModel.schema.index({ variantId: 1, createdAt: -1 });
StockMovementModel.schema.index({ warehouseId: 1, createdAt: -1 });

/* -------------------------------------------------------------------------- */
/* Reservations                                                                */
/* -------------------------------------------------------------------------- */

export const StockReservationModel = model(
  'StockReservation',
  new Schema(
    {
      warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
      variantId: {
        type: Schema.Types.ObjectId,
        ref: 'ProductVariant',
        required: true,
        index: true,
      },
      inventoryItemId: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
      },
      quantity: { type: Number, required: true, min: 1 },
      status: {
        type: String,
        enum: Object.values(RESERVATION_STATUS),
        default: RESERVATION_STATUS.ACTIVE,
        index: true,
      },
      reason: { type: String, default: null },
      referenceType: { type: String, default: 'manual', index: true },
      referenceId: { type: Schema.Types.ObjectId, default: null, index: true },
      expiresAt: { type: Date, required: true, index: true },
      timeoutMinutes: { type: Number, default: 30 },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      committedAt: { type: Date, default: null },
      releasedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'stock_reservations' },
  ),
);

StockReservationModel.schema.index({ status: 1, expiresAt: 1 });

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                   */
/* -------------------------------------------------------------------------- */

export const SupplierModel = model(
  'Supplier',
  new Schema(
    {
      companyName: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true, uppercase: true },
      contactPerson: { type: String, default: null },
      phone: { type: String, default: null },
      email: { type: String, default: null },
      address: { type: addressSchema, default: null },
      paymentTerms: { type: String, default: null },
      notes: { type: String, default: null },
      status: {
        type: String,
        enum: Object.values(SUPPLIER_STATUS),
        default: SUPPLIER_STATUS.ACTIVE,
        index: true,
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'suppliers' },
  ),
);
SupplierModel.schema.index({ code: 1 }, { unique: true });
SupplierModel.schema.index({ companyName: 'text', code: 'text', email: 'text' });

export const SupplierProductModel = model(
  'SupplierProduct',
  new Schema(
    {
      supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
      variantId: {
        type: Schema.Types.ObjectId,
        ref: 'ProductVariant',
        required: true,
        index: true,
      },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      supplierSku: { type: String, default: null },
      unitCost: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'LKR' },
      leadTimeDays: { type: Number, default: 0 },
      minOrderQty: { type: Number, default: 1 },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'supplier_products' },
  ),
);
SupplierProductModel.schema.index({ supplierId: 1, variantId: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Purchase orders                                                             */
/* -------------------------------------------------------------------------- */

export const PurchaseOrderModel = model(
  'PurchaseOrder',
  new Schema(
    {
      poNumber: { type: String, required: true, trim: true, uppercase: true },
      supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
      warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
      expectedDeliveryAt: { type: Date, default: null },
      status: {
        type: String,
        enum: Object.values(PO_STATUS),
        default: PO_STATUS.DRAFT,
        index: true,
      },
      currency: { type: String, default: 'LKR' },
      notes: { type: String, default: null },
      items: {
        type: [
          {
            variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
            productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
            sku: { type: String, default: null },
            quantityOrdered: { type: Number, required: true, min: 1 },
            quantityReceived: { type: Number, default: 0, min: 0 },
            unitCost: { type: Number, default: 0, min: 0 },
            lineTotal: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
      subtotal: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      orderedAt: { type: Date, default: null },
      receivedAt: { type: Date, default: null },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      ...softDelete,
    },
    { timestamps: true, collection: 'purchase_orders' },
  ),
);
PurchaseOrderModel.schema.index({ poNumber: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Transfers                                                                   */
/* -------------------------------------------------------------------------- */

export const StockTransferModel = model(
  'StockTransfer',
  new Schema(
    {
      transferNumber: { type: String, required: true, trim: true, uppercase: true },
      fromWarehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true,
        index: true,
      },
      toWarehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(TRANSFER_STATUS),
        default: TRANSFER_STATUS.REQUESTED,
        index: true,
      },
      items: {
        type: [
          {
            variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
            productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
            sku: { type: String, default: null },
            quantity: { type: Number, required: true, min: 1 },
            quantityReceived: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
      notes: { type: String, default: null },
      requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
      packedAt: { type: Date, default: null },
      shippedAt: { type: Date, default: null },
      receivedAt: { type: Date, default: null },
      cancelledAt: { type: Date, default: null },
      ...softDelete,
    },
    { timestamps: true, collection: 'stock_transfers' },
  ),
);
StockTransferModel.schema.index({ transferNumber: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Low stock / reorder rules                                                   */
/* -------------------------------------------------------------------------- */

export const InventoryRuleModel = model(
  'InventoryRule',
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ['low_stock', 'reorder'],
        required: true,
        index: true,
      },
      warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null, index: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null, index: true },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      threshold: { type: Number, required: true, min: 0 },
      reorderQuantity: { type: Number, default: null },
      notifyEmails: { type: [String], default: [] },
      isActive: { type: Boolean, default: true, index: true },
      ...softDelete,
    },
    { timestamps: true, collection: 'inventory_rules' },
  ),
);

/* -------------------------------------------------------------------------- */
/* Alerts                                                                      */
/* -------------------------------------------------------------------------- */

export const InventoryAlertModel = model(
  'InventoryAlert',
  new Schema(
    {
      type: {
        type: String,
        enum: Object.values(ALERT_TYPE),
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(ALERT_STATUS),
        default: ALERT_STATUS.OPEN,
        index: true,
      },
      warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null, index: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null, index: true },
      inventoryItemId: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryItem',
        default: null,
      },
      reservationId: {
        type: Schema.Types.ObjectId,
        ref: 'StockReservation',
        default: null,
      },
      message: { type: String, required: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
      acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      acknowledgedAt: { type: Date, default: null },
      resolvedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'inventory_alerts' },
  ),
);
InventoryAlertModel.schema.index({ type: 1, status: 1, createdAt: -1 });
