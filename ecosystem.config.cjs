/**
 * PM2 process file for the FE Platform API.
 * Cluster + wait_ready keeps old workers serving traffic until the new
 * workers finish MongoDB connect and signal ready — avoids nginx 502s.
 *
 * From repo root on EC2:
 *   pnpm --filter @fe-platform/api build
 *   pm2 startOrReload ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      wait_ready: true,
      listen_timeout: 60_000,
      kill_timeout: 15_000,
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
