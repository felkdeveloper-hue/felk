# EC2 auto-deploy (GitHub Actions)

When you push to `main`, GitHub Actions SSHs into your EC2 box, pulls the latest code, builds the API, and restarts PM2. You no longer need to pull/restart by hand after every backend change.

## One-time setup (required)

### 1. Create an SSH deploy key on EC2

On the EC2 instance (as the deploy user, often `ubuntu` or `ec2-user`):

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy   # private key — paste into GitHub secret EC2_SSH_KEY
```

Also allow the instance to `git pull` from GitHub (deploy key or HTTPS with a PAT if the repo is private).

### 2. Add GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret         | Example                         | Required              |
| -------------- | ------------------------------- | --------------------- |
| `EC2_HOST`     | `13.xxx.xxx.xxx` or your domain | Yes                   |
| `EC2_USER`     | `ubuntu`                        | Yes                   |
| `EC2_SSH_KEY`  | Full private key PEM contents   | Yes                   |
| `EC2_APP_DIR`  | `/home/ubuntu/felk`             | No (default `~/felk`) |
| `EC2_PORT`     | `22`                            | No                    |
| `PM2_APP_NAME` | `api` or `fe-api`               | No (auto-detects)     |

### 3. Put the app on EC2 once

```bash
cd ~
git clone https://github.com/felkdeveloper-hue/felk.git felk
cd felk
# ensure apps/api/.env exists with production values
pnpm install
pnpm --filter @fe-platform/api build
pm2 start apps/api/dist/server.js --name api
pm2 save
pm2 startup
```

### 4. Trigger a deploy

- Push any API change to `main`, **or**
- GitHub → **Actions** → **Deploy API to EC2** → **Run workflow**

## Manual fallback (if Actions is not configured yet)

SSH into EC2 and run:

```bash
cd ~/felk   # or your EC2_APP_DIR
bash scripts/deploy-ec2.sh
```

## Why Dashboard / Analytics 404 on fe.lk

The storefront/admin on Vercel already has the new UI. Those pages call:

- `GET /api/v1/analytics/admin/dashboard/layout`
- `GET /api/v1/analytics/admin/overview`

If EC2 still runs an older API build, those routes return **404**. After auto-deploy (or a manual `bash scripts/deploy-ec2.sh`) they resolve and the admin pages load.
