import { appConfig } from '@/config/app.config';

/**
 * OpenAPI 3 specification — Platform Core + Auth (Phase 2).
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: `${appConfig.app.name} API`,
    version: appConfig.app.version,
    description:
      'FE Platform REST API — Auth, CMS, Catalog, Inventory, Customers, Cart, Checkout, Payments & Orders',
  },
  servers: [
    {
      url: `http://localhost:${appConfig.server.port}${appConfig.server.apiPrefix}`,
      description: 'Local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'fe_access_token',
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string', example: '+94771234567' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          rememberMe: { type: 'boolean' },
          portal: { type: 'string', enum: ['customer', 'admin'] },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'Health, version, readiness' },
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'CMS', description: 'CMS & master data under /cms/*' },
    { name: 'Catalog', description: 'Product catalog under /catalog/*' },
    { name: 'Inventory', description: 'Warehouses & inventory under /inventory/*' },
    { name: 'Customers', description: 'Customer domain under /customers/*' },
    { name: 'Cart', description: 'Shopping cart under /cart/*' },
    { name: 'Checkout', description: 'Checkout engine under /checkout/*' },
    { name: 'Payments', description: 'Gateway-agnostic payment engine under /payments/*' },
    {
      name: 'Orders',
      description:
        'Order Management — created only by consuming a verified PaymentSucceeded event, under /orders/*',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness probe',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['System'],
        summary: 'Readiness probe',
        responses: { 200: { description: 'Ready' }, 503: { description: 'Not ready' } },
      },
    },
    '/version': {
      get: {
        tags: ['System'],
        summary: 'API version',
        responses: { 200: { description: 'Version' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register customer',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: { 201: { description: 'Registered' }, 409: { description: 'Email exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (customer or admin portal)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: { description: 'Tokens issued' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token',
        responses: { 200: { description: 'New tokens' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout current session',
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Logout all devices',
        responses: { 200: { description: 'Logged out all' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        responses: { 200: { description: 'Accepted' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        responses: { 200: { description: 'Password reset' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Change password (authenticated)',
        responses: { 200: { description: 'Changed' } },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email with token',
        responses: { 200: { description: 'Verified' } },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend verification email',
        responses: { 200: { description: 'Accepted' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Current authenticated user',
        responses: { 200: { description: 'Profile + permissions' } },
      },
    },
    '/cms/categories': {
      get: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'List categories',
        responses: { 200: { description: 'Paginated list' } },
      },
      post: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'Create category',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/cms/categories/tree': {
      get: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'Category tree',
        responses: { 200: { description: 'Nested tree' } },
      },
    },
    '/cms/blogs': {
      get: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'List blogs',
        responses: { 200: { description: 'Paginated list' } },
      },
    },
    '/cms/settings': {
      get: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'List store settings',
        responses: { 200: { description: 'Settings (secrets masked)' } },
      },
      put: {
        tags: ['CMS'],
        security: [{ bearerAuth: [] }],
        summary: 'Upsert store setting',
        responses: { 200: { description: 'Saved' } },
      },
    },
    '/cms/settings/public': {
      get: {
        tags: ['CMS'],
        summary: 'Public settings',
        responses: { 200: { description: 'Public key/values' } },
      },
    },
    '/catalog/products': {
      get: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'List / search products (advanced filters)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'sku', in: 'query', schema: { type: 'string' } },
          { name: 'barcode', in: 'query', schema: { type: 'string' } },
          { name: 'brandId', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'collectionId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'Paginated products' } },
      },
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Create product',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/catalog/products/{id}': {
      get: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Get product with variants, media, relationships',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product detail' } },
      },
      patch: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Update product',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Soft delete product',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/catalog/products/{id}/duplicate': {
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Duplicate product + variants',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Duplicated' } },
      },
    },
    '/catalog/products/{id}/publish': {
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Publish or schedule product',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Published' } },
      },
    },
    '/catalog/products/{productId}/variants': {
      get: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'List variants',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Variants' } },
      },
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Create variant',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/catalog/variants/{variantId}/clone': {
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Clone variant',
        parameters: [{ name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Cloned' } },
      },
    },
    '/catalog/products/{productId}/media/upload': {
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Upload media (Sharp → WebP resize/compress)',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Uploaded' } },
      },
    },
    '/catalog/attributes': {
      get: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'List product attributes',
        responses: { 200: { description: 'Attributes' } },
      },
      post: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        summary: 'Create attribute',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory/warehouses': {
      get: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'List warehouses',
        responses: { 200: { description: 'Paginated warehouses' } },
      },
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Create warehouse',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory/items': {
      get: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'List inventory items (variant × warehouse)',
        responses: { 200: { description: 'Paginated stock positions' } },
      },
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Create inventory item',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory/adjustments': {
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Adjust stock (increase/decrease)',
        responses: { 201: { description: 'Adjusted' } },
      },
    },
    '/inventory/reservations': {
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Reserve available stock',
        responses: { 201: { description: 'Reserved' } },
      },
    },
    '/inventory/transfers': {
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Create warehouse transfer',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory/purchase-orders': {
      post: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Create purchase order',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory/suppliers': {
      get: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'List suppliers',
        responses: { 200: { description: 'Suppliers' } },
      },
    },
    '/inventory/movements': {
      get: {
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        summary: 'Immutable stock history / movements',
        responses: { 200: { description: 'Ledger' } },
      },
    },
    '/customers/me': {
      get: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'Current customer profile (lazy create)',
        responses: { 200: { description: 'Customer profile' } },
      },
      patch: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'Update own profile',
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/customers/me/addresses': {
      get: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'List own addresses',
        responses: { 200: { description: 'Addresses' } },
      },
      post: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'Create address',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/customers/me/wishlists': {
      get: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'List own wishlists',
        responses: { 200: { description: 'Wishlists' } },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        summary: 'Admin list customers',
        responses: { 200: { description: 'Paginated customers' } },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get guest or authenticated cart',
        parameters: [
          {
            name: 'x-guest-cart-token',
            in: 'header',
            schema: { type: 'string' },
            description: 'Guest cart token (optional for guests)',
          },
        ],
        responses: { 200: { description: 'Cart with items, saved-for-later, totals' } },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add variant to cart',
        responses: { 201: { description: 'Item added' } },
      },
    },
    '/cart/merge': {
      post: {
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        summary: 'Merge guest cart into customer cart',
        responses: { 200: { description: 'Merged' } },
      },
    },
    '/cart/validate': {
      post: {
        tags: ['Cart'],
        summary: 'Validate cart against catalog & inventory',
        responses: { 200: { description: 'Validation result' } },
      },
    },
    '/cart/admin/{customerId}': {
      get: {
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        summary: 'Admin read-only customer cart',
        parameters: [
          { name: 'customerId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Customer cart' } },
      },
    },
    '/checkout/start': {
      post: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Start checkout — validate cart, calculate totals, reserve stock',
        responses: { 201: { description: 'Checkout session + token' } },
      },
    },
    '/checkout/{id}': {
      get: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Get checkout session by id or token',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Checkout summary' } },
      },
    },
    '/checkout/validate': {
      post: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Re-validate checkout lines and prices',
        responses: { 200: { description: 'Validation result' } },
      },
    },
    '/checkout/reserve': {
      post: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Reserve inventory (never commits)',
        responses: { 200: { description: 'Reserved' } },
      },
    },
    '/checkout/release': {
      post: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Release inventory reservations',
        responses: { 200: { description: 'Released' } },
      },
    },
    '/checkout/refresh': {
      post: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Refresh totals and optionally extend reservation',
        responses: { 200: { description: 'Refreshed' } },
      },
    },
    '/checkout/cancel': {
      delete: {
        tags: ['Checkout'],
        security: [{ bearerAuth: [] }],
        summary: 'Cancel checkout and release reservations',
        responses: { 200: { description: 'Cancelled' } },
      },
    },
    '/payments/create': {
      post: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'Create a payment for a READY checkout session and get a gateway redirect',
        responses: {
          201: { description: 'Payment created + redirect URL' },
          409: { description: 'Payment already in progress / requires retry' },
        },
      },
    },
    '/payments/retry': {
      post: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'Retry a failed/expired/cancelled payment — new attempt + new gateway link',
        responses: { 200: { description: 'New attempt created' } },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'Get payment by id or checkout token (owner, Finance, or Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Payment detail' } },
      },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'List payments — own only for customers, all for Finance/Admin',
        responses: { 200: { description: 'Paginated payments' } },
      },
    },
    '/payments/{id}/refund': {
      post: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'Request a partial/full refund (Finance/Admin) — structure only',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Refund requested' } },
      },
    },
    '/payments/status/{checkoutToken}': {
      get: {
        tags: ['Payments'],
        summary: 'Public payment status probe used by gateway return/cancel pages',
        parameters: [
          { name: 'checkoutToken', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Minimal status (no sensitive data)' } },
      },
    },
    '/payments/webhooks/payhere': {
      post: {
        tags: ['Payments'],
        summary: 'PayHere webhook — signature-verified, idempotent, never trusts the client',
        responses: {
          200: { description: 'Acknowledged' },
          400: { description: 'Invalid signature' },
        },
      },
    },
    '/payments/webhooks/koko': {
      post: {
        tags: ['Payments'],
        summary: 'Koko webhook — HMAC-SHA256 signed, idempotent',
        responses: {
          200: { description: 'Acknowledged' },
          400: { description: 'Invalid signature' },
        },
      },
    },
    '/payments/webhooks/mintpay': {
      post: {
        tags: ['Payments'],
        summary: 'Mintpay webhook — HMAC-SHA256 signed, idempotent',
        responses: {
          200: { description: 'Acknowledged' },
          400: { description: 'Invalid signature' },
        },
      },
    },
    '/payments/webhooks/cod': {
      post: {
        tags: ['Payments'],
        summary: 'Cash-on-delivery collection confirmation — HMAC signed internal webhook',
        responses: {
          200: { description: 'Acknowledged' },
          400: { description: 'Invalid signature' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'List orders — own only for customers, all for Admin/Warehouse/Finance/Support',
        responses: { 200: { description: 'Paginated orders' } },
      },
    },
    '/orders/export': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Export orders snapshot (Admin)',
        responses: { 200: { description: 'Orders snapshot' } },
      },
    },
    '/orders/number/{orderNumber}': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Get order by human-readable order number (owner, Admin, or staff)',
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Order detail' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Get order by id (owner, Admin, or staff)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order detail' } },
      },
    },
    '/orders/{id}/timeline': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Get order lifecycle timeline (owner, Admin, or staff)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Timeline events' } },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary:
          'Transition order status — validated against the allowed-transition map (Warehouse/Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order updated' },
          400: { description: 'Invalid status transition' },
        },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Cancel an order and reverse its committed inventory (owner or Admin/Support)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order cancelled' },
          400: { description: 'Order can no longer be cancelled' },
        },
      },
    },
    '/orders/{id}/note': {
      post: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Add an internal/customer-visible note to an order (Support/Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Note added' } },
      },
    },
    '/orders/{id}/notes': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'List notes on an order (Support/Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Notes' } },
      },
    },
    '/orders/{id}/invoice': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Get (and lazily generate) the invoice for an order (owner, Finance, or Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Invoice — PDF/GST/VAT are placeholders' } },
      },
    },
    '/orders/{id}/return': {
      post: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Request a return on a delivered order — structure only (owner or Admin/Support)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Return requested' },
          400: { description: 'Order not yet delivered' },
        },
      },
    },
    '/orders/{id}/returns': {
      get: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'List return requests for an order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Return requests' } },
      },
    },
  },
} as const;
