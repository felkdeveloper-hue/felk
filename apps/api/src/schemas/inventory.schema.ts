import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from '@/schemas/common.schema';
import {
  MOVEMENT_TYPE,
  PO_STATUS,
  TRANSFER_STATUS,
  WAREHOUSE_STATUS,
  SUPPLIER_STATUS,
  ALERT_TYPE,
  ALERT_STATUS,
} from '@/constants/inventory';

const addressSchema = z
  .object({
    line1: z.string().trim().max(200).nullable().optional(),
    line2: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    state: z.string().trim().max(100).nullable().optional(),
    postalCode: z.string().trim().max(40).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
  })
  .nullable()
  .optional();

export const warehouseCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(40),
  address: addressSchema,
  contactName: z.string().trim().max(120).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal('')),
  managerUserId: objectIdSchema.nullable().optional(),
  priority: z.number().int().min(0).optional(),
  timezone: z.string().trim().max(80).optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(Object.values(WAREHOUSE_STATUS) as [string, ...string[]]).optional(),
});

export const warehouseUpdateSchema = warehouseCreateSchema.partial();

export const inventoryItemCreateSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  onHand: z.number().int().min(0).optional(),
  reserved: z.number().int().min(0).optional(),
  incoming: z.number().int().min(0).optional(),
  damaged: z.number().int().min(0).optional(),
  returned: z.number().int().min(0).optional(),
  safetyStock: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  maximumStock: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});

export const inventoryItemUpdateSchema = z.object({
  safetyStock: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  maximumStock: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  sku: z.string().trim().max(64).optional(),
});

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  warehouseId: objectIdSchema.optional(),
  variantId: objectIdSchema.optional(),
  productId: objectIdSchema.optional(),
  sku: z.string().optional(),
  stockStatus: z.string().optional(),
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  minAvailable: z.coerce.number().min(0).optional(),
  maxAvailable: z.coerce.number().min(0).optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const adjustStockSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  quantity: z.number().int().positive(),
  direction: z.enum(['increase', 'decrease']),
  reason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
  unitCost: z.number().min(0).optional(),
});

export const receiveStockSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0).optional(),
  referenceType: z.string().optional(),
  referenceId: objectIdSchema.optional(),
  note: z.string().trim().max(500).optional(),
});

export const damageStockSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  quantity: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
});

export const returnStockSchema = damageStockSchema.extend({
  referenceId: objectIdSchema.optional(),
});

export const movementCreateSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  type: z.enum(Object.values(MOVEMENT_TYPE) as [string, ...string[]]),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0).optional(),
  referenceType: z.string().optional(),
  referenceId: objectIdSchema.optional(),
  reason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
});

export const movementListQuerySchema = paginationQuerySchema.extend({
  warehouseId: objectIdSchema.optional(),
  variantId: objectIdSchema.optional(),
  type: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: objectIdSchema.optional(),
});

export const reserveStockSchema = z.object({
  warehouseId: objectIdSchema,
  variantId: objectIdSchema,
  quantity: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
  referenceType: z.string().optional(),
  referenceId: objectIdSchema.optional(),
  timeoutMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional(),
  expiresAt: z.coerce.date().optional(),
});

export const reservationListQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  warehouseId: objectIdSchema.optional(),
  variantId: objectIdSchema.optional(),
});

export const supplierCreateSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(40),
  contactPerson: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  address: addressSchema,
  paymentTerms: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(Object.values(SUPPLIER_STATUS) as [string, ...string[]]).optional(),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export const supplierProductCreateSchema = z.object({
  variantId: objectIdSchema,
  supplierSku: z.string().trim().max(80).nullable().optional(),
  unitCost: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  minOrderQty: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const supplierProductUpdateSchema = supplierProductCreateSchema.partial();

export const poItemSchema = z.object({
  variantId: objectIdSchema,
  quantityOrdered: z.number().int().positive(),
  unitCost: z.number().min(0).optional(),
});

export const purchaseOrderCreateSchema = z.object({
  poNumber: z.string().trim().max(40).optional(),
  supplierId: objectIdSchema,
  warehouseId: objectIdSchema,
  expectedDeliveryAt: z.coerce.date().nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(Object.values(PO_STATUS) as [string, ...string[]]).optional(),
  items: z.array(poItemSchema).min(1).max(500),
});

export const purchaseOrderUpdateSchema = z.object({
  expectedDeliveryAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  status: z.enum(Object.values(PO_STATUS) as [string, ...string[]]).optional(),
});

export const poReceiveSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: objectIdSchema,
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const transferItemSchema = z.object({
  variantId: objectIdSchema,
  quantity: z.number().int().positive(),
});

export const transferCreateSchema = z.object({
  transferNumber: z.string().trim().max(40).optional(),
  fromWarehouseId: objectIdSchema,
  toWarehouseId: objectIdSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(transferItemSchema).min(1).max(500),
});

export const inventoryRuleCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['low_stock', 'reorder']),
  warehouseId: objectIdSchema.nullable().optional(),
  variantId: objectIdSchema.nullable().optional(),
  productId: objectIdSchema.nullable().optional(),
  threshold: z.number().int().min(0),
  reorderQuantity: z.number().int().positive().nullable().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
});

export const inventoryRuleUpdateSchema = inventoryRuleCreateSchema.partial();

export const alertListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(Object.values(ALERT_STATUS) as [string, ...string[]]).optional(),
  type: z.enum(Object.values(ALERT_TYPE) as [string, ...string[]]).optional(),
  warehouseId: objectIdSchema.optional(),
});

export const bulkInventoryUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: objectIdSchema,
        data: inventoryItemUpdateSchema,
      }),
    )
    .min(1)
    .max(200),
});

export const inventoryBulkIdsSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
});

export const inventoryIdParamsSchema = z.object({ id: objectIdSchema });
export const supplierIdParamsSchema = z.object({ supplierId: objectIdSchema });
export const productLinkParamsSchema = z.object({ productLinkId: objectIdSchema });

export const listStatusQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  supplierId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  fromWarehouseId: objectIdSchema.optional(),
  toWarehouseId: objectIdSchema.optional(),
  type: z.string().optional(),
});

export const transferStatusValues = Object.values(TRANSFER_STATUS);
