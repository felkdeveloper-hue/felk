import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { warehouseService } from '@/services/warehouse.service';
import { inventoryService } from '@/services/inventory.service';
import { reservationService } from '@/services/reservation.service';
import { supplierService } from '@/services/supplier.service';
import { purchaseOrderService } from '@/services/purchase-order.service';
import { transferService } from '@/services/transfer.service';
import { inventoryAlertService } from '@/services/inventory-alert.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { cmsListQuerySchema } from '@/schemas/cms.shared.schema';
import * as S from '@/schemas/inventory.schema';
import type { MovementType } from '@/constants/inventory';

const P = PERMISSIONS;

const viewPerms = [P.INVENTORY_VIEW, P.INVENTORY_READ] as const;
const createPerms = [P.INVENTORY_CREATE, P.INVENTORY_UPDATE] as const;
const updatePerms = [P.INVENTORY_UPDATE] as const;
const adjustPerms = [P.INVENTORY_ADJUST] as const;
const transferPerms = [P.INVENTORY_TRANSFER] as const;
const reservePerms = [P.INVENTORY_RESERVE] as const;
const exportPerms = [P.INVENTORY_EXPORT, P.INVENTORY_VIEW, P.INVENTORY_READ] as const;
const warehousePerms = [P.WAREHOUSE_MANAGE, P.WAREHOUSES_MANAGE] as const;
const warehouseViewPerms = [
  P.WAREHOUSE_MANAGE,
  P.WAREHOUSES_MANAGE,
  P.WAREHOUSES_READ,
  P.INVENTORY_VIEW,
  P.INVENTORY_READ,
] as const;
const supplierPerms = [P.SUPPLIER_MANAGE] as const;
const poPerms = [P.PURCHASE_ORDER_MANAGE] as const;

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

/* -------------------------------------------------------------------------- */
/* Warehouses                                                                  */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/warehouses',
  authorizeAny(...warehouseViewPerms),
  validate({ query: cmsListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await warehouseService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/warehouses',
  authorizeAny(...warehousePerms),
  validate({ body: S.warehouseCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await warehouseService.create(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/warehouses/:id',
  authorizeAny(...warehouseViewPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await warehouseService.getById(String(req.params.id)));
  }),
);

inventoryRouter.patch(
  '/warehouses/:id',
  authorizeAny(...warehousePerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.warehouseUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await warehouseService.update(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

inventoryRouter.delete(
  '/warehouses/:id',
  authorizeAny(...warehousePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await warehouseService.remove(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

inventoryRouter.post(
  '/warehouses/:id/restore',
  authorizeAny(...warehousePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await warehouseService.restore(String(req.params.id), actorFromRequest(req)),
      'Restored',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Inventory items                                                             */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/items',
  authorizeAny(...viewPerms),
  validate({ query: S.inventoryListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.get(
  '/items/export',
  authorizeAny(...exportPerms),
  validate({ query: S.inventoryListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.exportAll(req.query as never);
    ApiResponse.success(res, result.data, 'Export ready', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/items/import',
  authorizeAny(...createPerms),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await inventoryService.importPlaceholder(actorFromRequest(req)));
  }),
);

inventoryRouter.patch(
  '/items/bulk',
  authorizeAny(...updatePerms),
  validate({ body: S.bulkInventoryUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryService.bulkUpdate(req.body.updates, actorFromRequest(req)),
      'Bulk update complete',
    );
  }),
);

inventoryRouter.post(
  '/items/bulk-delete',
  authorizeAny(...updatePerms),
  validate({ body: S.inventoryBulkIdsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryService.bulkDelete(req.body.ids, actorFromRequest(req)),
      'Bulk delete complete',
    );
  }),
);

inventoryRouter.post(
  '/items',
  authorizeAny(...createPerms),
  validate({ body: S.inventoryItemCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await inventoryService.createItem(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/items/:id',
  authorizeAny(...viewPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await inventoryService.getById(String(req.params.id)));
  }),
);

inventoryRouter.patch(
  '/items/:id',
  authorizeAny(...updatePerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.inventoryItemUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryService.updateItem(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Movements / adjustments / receiving                                         */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/movements',
  authorizeAny(...viewPerms),
  validate({ query: S.movementListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.listHistory(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.get(
  '/history',
  authorizeAny(...viewPerms),
  validate({ query: S.movementListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.listHistory(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/movements',
  authorizeAny(...adjustPerms),
  validate({ body: S.movementCreateSchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.applyMovement(
      {
        ...req.body,
        type: req.body.type as MovementType,
      },
      actorFromRequest(req),
    );
    ApiResponse.created(res, result);
  }),
);

inventoryRouter.post(
  '/adjustments',
  authorizeAny(...adjustPerms),
  validate({ body: S.adjustStockSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await inventoryService.adjust(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.post(
  '/receiving',
  authorizeAny(...adjustPerms),
  validate({ body: S.receiveStockSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await inventoryService.receive(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.post(
  '/damaged',
  authorizeAny(...adjustPerms),
  validate({ body: S.damageStockSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await inventoryService.markDamaged(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.post(
  '/returns',
  authorizeAny(...adjustPerms),
  validate({ body: S.returnStockSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await inventoryService.returnToInventory(req.body, actorFromRequest(req)),
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Reservations                                                                */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/reservations',
  authorizeAny(...viewPerms, ...reservePerms),
  validate({ query: S.reservationListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await reservationService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/reservations',
  authorizeAny(...reservePerms),
  validate({ body: S.reserveStockSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await reservationService.reserve(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.post(
  '/reservations/expire-due',
  authorizeAny(...reservePerms, ...adjustPerms),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await reservationService.expireDue(actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/reservations/:id',
  authorizeAny(...viewPerms, ...reservePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await reservationService.getById(String(req.params.id)));
  }),
);

inventoryRouter.post(
  '/reservations/:id/release',
  authorizeAny(...reservePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await reservationService.release(String(req.params.id), actorFromRequest(req)),
      'Released',
    );
  }),
);

inventoryRouter.post(
  '/reservations/:id/commit',
  authorizeAny(...reservePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await reservationService.commit(String(req.params.id), actorFromRequest(req)),
      'Committed',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                   */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/suppliers',
  authorizeAny(...supplierPerms, ...viewPerms),
  validate({ query: cmsListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await supplierService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/suppliers',
  authorizeAny(...supplierPerms),
  validate({ body: S.supplierCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await supplierService.create(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/suppliers/:id',
  authorizeAny(...supplierPerms, ...viewPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await supplierService.getById(String(req.params.id)));
  }),
);

inventoryRouter.patch(
  '/suppliers/:id',
  authorizeAny(...supplierPerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.supplierUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await supplierService.update(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

inventoryRouter.delete(
  '/suppliers/:id',
  authorizeAny(...supplierPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await supplierService.remove(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

inventoryRouter.get(
  '/suppliers/:supplierId/products',
  authorizeAny(...supplierPerms, ...viewPerms),
  validate({ params: S.supplierIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await supplierService.listProducts(String(req.params.supplierId)));
  }),
);

inventoryRouter.post(
  '/suppliers/:supplierId/products',
  authorizeAny(...supplierPerms),
  validate({ params: S.supplierIdParamsSchema, body: S.supplierProductCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await supplierService.addProduct(
        String(req.params.supplierId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

inventoryRouter.patch(
  '/supplier-products/:productLinkId',
  authorizeAny(...supplierPerms),
  validate({ params: S.productLinkParamsSchema, body: S.supplierProductUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await supplierService.updateProduct(
        String(req.params.productLinkId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

inventoryRouter.delete(
  '/supplier-products/:productLinkId',
  authorizeAny(...supplierPerms),
  validate({ params: S.productLinkParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await supplierService.removeProduct(String(req.params.productLinkId), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Purchase orders                                                             */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/purchase-orders',
  authorizeAny(...poPerms, ...viewPerms),
  validate({ query: S.listStatusQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/purchase-orders',
  authorizeAny(...poPerms),
  validate({ body: S.purchaseOrderCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await purchaseOrderService.create(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/purchase-orders/:id',
  authorizeAny(...poPerms, ...viewPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await purchaseOrderService.getById(String(req.params.id)));
  }),
);

inventoryRouter.patch(
  '/purchase-orders/:id',
  authorizeAny(...poPerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.purchaseOrderUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await purchaseOrderService.update(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

inventoryRouter.delete(
  '/purchase-orders/:id',
  authorizeAny(...poPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await purchaseOrderService.remove(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/order',
  authorizeAny(...poPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await purchaseOrderService.placeOrder(String(req.params.id), actorFromRequest(req)),
      'Ordered',
    );
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/receive',
  authorizeAny(...poPerms, ...adjustPerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.poReceiveSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await purchaseOrderService.receive(
        String(req.params.id),
        req.body.lines,
        actorFromRequest(req),
      ),
      'Received',
    );
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/cancel',
  authorizeAny(...poPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await purchaseOrderService.cancel(String(req.params.id), actorFromRequest(req)),
      'Cancelled',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Transfers                                                                   */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/transfers',
  authorizeAny(...transferPerms, ...viewPerms),
  validate({ query: S.listStatusQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await transferService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/transfers',
  authorizeAny(...transferPerms),
  validate({ body: S.transferCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await transferService.create(req.body, actorFromRequest(req)));
  }),
);

inventoryRouter.get(
  '/transfers/:id',
  authorizeAny(...transferPerms, ...viewPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await transferService.getById(String(req.params.id)));
  }),
);

inventoryRouter.post(
  '/transfers/:id/approve',
  authorizeAny(...transferPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await transferService.approve(String(req.params.id), actorFromRequest(req)),
      'Approved',
    );
  }),
);

inventoryRouter.post(
  '/transfers/:id/pack',
  authorizeAny(...transferPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await transferService.pack(String(req.params.id), actorFromRequest(req)),
      'Packed',
    );
  }),
);

inventoryRouter.post(
  '/transfers/:id/ship',
  authorizeAny(...transferPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await transferService.ship(String(req.params.id), actorFromRequest(req)),
      'Shipped',
    );
  }),
);

inventoryRouter.post(
  '/transfers/:id/receive',
  authorizeAny(...transferPerms, ...adjustPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await transferService.receive(String(req.params.id), actorFromRequest(req)),
      'Received',
    );
  }),
);

inventoryRouter.post(
  '/transfers/:id/cancel',
  authorizeAny(...transferPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await transferService.cancel(String(req.params.id), actorFromRequest(req)),
      'Cancelled',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Alerts & rules                                                              */
/* -------------------------------------------------------------------------- */

inventoryRouter.get(
  '/alerts',
  authorizeAny(...viewPerms),
  validate({ query: S.alertListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryAlertService.listAlerts(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/alerts/:id/acknowledge',
  authorizeAny(...updatePerms, ...adjustPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryAlertService.acknowledge(String(req.params.id), actorFromRequest(req)),
      'Acknowledged',
    );
  }),
);

inventoryRouter.post(
  '/alerts/:id/resolve',
  authorizeAny(...updatePerms, ...adjustPerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryAlertService.resolve(String(req.params.id), actorFromRequest(req)),
      'Resolved',
    );
  }),
);

inventoryRouter.get(
  '/rules',
  authorizeAny(...viewPerms),
  validate({ query: S.listStatusQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await inventoryAlertService.listRules(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

inventoryRouter.post(
  '/rules',
  authorizeAny(...updatePerms),
  validate({ body: S.inventoryRuleCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await inventoryAlertService.createRule(req.body, actorFromRequest(req)),
    );
  }),
);

inventoryRouter.patch(
  '/rules/:id',
  authorizeAny(...updatePerms),
  validate({ params: S.inventoryIdParamsSchema, body: S.inventoryRuleUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryAlertService.updateRule(
        String(req.params.id),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

inventoryRouter.delete(
  '/rules/:id',
  authorizeAny(...updatePerms),
  validate({ params: S.inventoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await inventoryAlertService.removeRule(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);
