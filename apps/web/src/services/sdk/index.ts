export { authApi } from './auth';
export { productsApi } from './products';
export type {
  Product,
  ProductMedia,
  ProductMoney,
  ProductPricingInsights,
  ProductRelationship,
  ProductVariant,
  ProductListParams,
} from './products';

export { categoriesApi } from './categories';
export type { Category, CategoryTreeNode } from './categories';

export { customersApi } from './customers';
export type {
  CustomerAddress,
  CustomerAddressInput,
  CustomerPreferences,
  CustomerPreferenceValues,
  CustomerNotificationPreferences,
  CustomerProfile,
  RecentlyViewedItem,
  ReferralSummary,
  RewardBalance,
  RewardHistoryEntry,
  SavedItem,
  Wishlist,
  WishlistItem,
} from './customers';

export { cartApi } from './cart';
export type {
  CartAddItemPayload,
  CartLineItem,
  CartTotals,
  CartUpdateItemPayload,
  CartValidationResult,
  CartView,
} from './cart';

export { checkoutApi } from './checkout';
export type {
  CheckoutAddressSnapshot,
  CheckoutLine,
  CheckoutRefreshPayload,
  CheckoutSession,
  CheckoutStartPayload,
  CheckoutStatus,
  CheckoutTotals,
  CheckoutValidationIssue,
  ShippingMethod,
} from './checkout';

export { paymentsApi } from './payments';
export type {
  PaymentCreatePayload,
  PaymentMethod,
  PaymentRecord,
  PaymentRetryPayload,
  PaymentStatus,
  PaymentStatusResult,
  Refund,
  RefundRequestPayload,
} from './payments';

export { ordersApi } from './orders';
export type {
  Order,
  OrderAddressSnapshot,
  OrderInvoice,
  OrderLineItem,
  OrderListParams,
  OrderReturn,
  OrderReturnRequestPayload,
  OrderStatus,
  OrderTimelineEntry,
  OrderTotals,
  OrderTrackingInfo,
} from './orders';

export { inventoryApi } from './inventory';
export type { InventoryItem, InventoryListParams, StockReservation, Warehouse } from './inventory';

export { catalogFacetsApi } from './catalog-facets';
export type { CatalogFacet } from './catalog-facets';

export { cmsApi } from './cms';
export type {
  Announcement,
  BlogCategory,
  BlogPost,
  Brand,
  CmsPage,
  Collection,
  ContactInfo,
  Faq,
  HeroBanner,
  HomeSection,
  PromoBanner,
  PublicSettingRow,
  PublicSettings,
  SocialLink,
} from './cms';
