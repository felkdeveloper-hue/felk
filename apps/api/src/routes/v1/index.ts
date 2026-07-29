import { Router } from 'express';
import { authRouter } from '@/routes/auth.routes.js';
import { systemRouter } from '@/routes/system.routes.js';
import { cmsRouter } from '@/routes/cms/cms.routes.js';
import { catalogRouter } from '@/routes/catalog/catalog.routes.js';
import { inventoryRouter } from '@/routes/inventory/inventory.routes.js';
import { customersRouter } from '@/routes/customers/customers.routes.js';
import { usersRouter } from '@/routes/users/users.routes.js';
import { auditRouter } from '@/routes/audit/audit.routes.js';
import { cartRouter } from '@/routes/cart/cart.routes.js';
import { checkoutRouter } from '@/routes/checkout/checkout.routes.js';
import { paymentsRouter } from '@/routes/payments/payments.routes.js';
import { ordersRouter } from '@/routes/orders/orders.routes.js';
import { storefrontRouter } from '@/routes/storefront.routes.js';
import { reviewsRouter } from '@/routes/reviews.routes.js';
import { trackingRouter } from '@/routes/tracking/tracking.routes.js';
import { integrationsRouter } from '@/routes/integrations/integrations.routes.js';

/**
 * API v1 root router.
 */
export const v1Router = Router();

v1Router.use('/storefront', storefrontRouter);
v1Router.use(reviewsRouter);
v1Router.use(systemRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/cms', cmsRouter);
v1Router.use('/catalog', catalogRouter);
v1Router.use('/inventory', inventoryRouter);
v1Router.use('/customers', customersRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/audit', auditRouter);
v1Router.use('/cart', cartRouter);
v1Router.use('/checkout', checkoutRouter);
v1Router.use('/payments', paymentsRouter);
v1Router.use('/orders', ordersRouter);
v1Router.use('/tracking', trackingRouter);
v1Router.use('/integrations', integrationsRouter);
