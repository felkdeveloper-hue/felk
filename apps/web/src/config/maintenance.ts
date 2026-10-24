/**
 * Locks the storefront. Visitors only see the maintenance screen.
 * Set VITE_MAINTENANCE_MODE=false in apps/web/.env to reopen the shop.
 */
export const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE !== 'false';
