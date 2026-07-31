/**
 * PM2 process file for the FE Platform API.
 *
 * IMPORTANT: Do not force NODE_ENV here. apps/api/.env is loaded by dotenv
 * at boot. Forcing production while .env still has localhost CORS / dev
 * secrets makes the process crash-loop (Invalid environment variables).
 *
 * From repo root on EC2:
 *   pnpm --filter @fe-platform/api build
 *   pm2 delete api felk-api 2>/dev/null || true
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      wait_ready: true,
      listen_timeout: 60_000,
      kill_timeout: 15_000,
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 200,
      // Keep autorestart on; stop the infinite ghost-id thrash after hard failures.
      max_restarts: 30,
      min_uptime: '5s',
    },
  ],
};
