/**
 * Locks the storefront when enabled. Visitors only see the maintenance screen.
 * Set VITE_MAINTENANCE_MODE=true in apps/web/.env (or hosting env) to enable.
 * Defaults to off so the shop stays live.
 */
export const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
