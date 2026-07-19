export { authApi } from './auth';
export type { LoginPayload } from './auth';
export { productsApi } from './products';
export { ordersApi } from './orders';
export { customersApi } from './customers';
export { usersApi } from './users';
export { inventoryApi } from './inventory';
export { paymentsApi } from './payments';
export { cmsApi, createCmsResourceApi } from './cms';
export { mediaApi } from './media';
export { auditApi } from './audit';
export { reviewsApi } from './reviews';

export type {
  AdminProduct,
  AdminVariant,
  ProductInput,
  ProductListParams,
  VariantInput,
} from './products';
export type { AdminOrder, OrderListParams } from './orders';
export type { AdminCustomer } from './customers';
export type { AdminUserRow, UserListParams } from './users';
export type {
  InventoryItemCreateInput,
  InventoryItemRow,
  StockAdjustInput,
  WarehouseRow,
} from './inventory';
export type { PaymentRow } from './payments';
export type { CmsResource } from './cms';
export type { MediaUploadOptions, ProductMediaRow } from './media';
export type { AuditListParams, AuditLogRow } from './audit';
export type { AdminReview, ReviewListParams } from './reviews';
