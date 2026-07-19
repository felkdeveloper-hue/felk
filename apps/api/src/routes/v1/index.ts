import { Router } from 'express';
import { authRouter } from '@/routes/auth.routes';
import { systemRouter } from '@/routes/system.routes';
import { cmsRouter } from '@/routes/cms/cms.routes';
import { catalogRouter } from '@/routes/catalog/catalog.routes';
import { inventoryRouter } from '@/routes/inventory/inventory.routes';
import { customersRouter } from '@/routes/customers/customers.routes';
import { usersRouter } from '@/routes/users/users.routes';
import { cartRouter } from '@/routes/cart/cart.routes';
import { checkoutRouter } from '@/routes/checkout/checkout.routes';
import { paymentsRouter } from '@/routes/payments/payments.routes';
import { ordersRouter } from '@/routes/orders/orders.routes';
import { storefrontRouter } from '@/routes/storefront.routes';
import { reviewsRouter } from '@/routes/reviews.routes';

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
v1Router.use('/cart', cartRouter);
v1Router.use('/checkout', checkoutRouter);
v1Router.use('/payments', paymentsRouter);
v1Router.use('/orders', ordersRouter);
