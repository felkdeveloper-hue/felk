export { productsApi } from './products';
export type {
  AdminProduct,
  AdminVariant,
  ProductInput,
  ProductListParams,
  VariantInput,
} from './products';

export { inventoryApi } from './inventory';
export type {
  InventoryItemCreateInput,
  InventoryItemRow,
  StockAdjustInput,
  WarehouseRow,
} from './inventory';

export { cmsApi, createCmsResourceApi } from './cms';
export type { CmsResource } from './cms';

export { ordersApi } from './orders';
export type { AdminOrder, OrderListParams } from './orders';

export { customersApi } from './customers';
export type { AdminCustomer } from './customers';

export { usersApi } from './users';
export type { AdminUserRow, UserListParams } from './users';

export { auditApi } from './audit';
export type { AuditListParams, AuditLogRow } from './audit';

export { paymentsApi } from './payments';
export type { PaymentRow } from './payments';

export { mediaApi } from './media';
export type { MediaUploadOptions, ProductMediaRow } from './media';

export { integrationsApi } from './integrations';
export type { IntegrationsStatus, GatewayStatus, SmtpStatus } from './integrations';
