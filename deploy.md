# DisciplineTrack — VPS Deployment Guide

Complete guide to deploying DisciplineTrack on a Linux VPS (Ubuntu 22.04 / Debian 12 recommended).

---

## Deployment strategies

The UI is built with TanStack Start using the **Cloudflare Workers** preset. Two sensible paths exist:

| | Strategy A — Hybrid (Recommended) | Strategy B — Full VPS |
|---|---|---|
| **UI** | Cloudflare Workers (free tier) | Node.js process on VPS |
| **API** | VPS (gunicorn + nginx) | VPS (gunicorn + nginx) |
| **Effort** | Lower — Cloudflare handles CDN, SSL, global edge | Higher — you manage the Node.js server and SSL for the UI |
| **When to use** | Always, unless you have a specific reason to self-host the frontend | Air-gapped / private networks where Cloudflare is not permitted |

**Strategy A is recommended.** The Cloudflare plugin is already wired — `wrangler deploy` puts the UI on Cloudflare's edge in one command. The Django API is the only thing that needs a VPS. The fingerprint agent always runs on individual workstations — it is never deployed to a server.

---

## Table of Contents

1. [VPS prerequisites](#1-vps-prerequisites)
2. [PostgreSQL](#2-postgresql)
3. [Django API — gunicorn + systemd](#3-django-api--gunicorn--systemd)
4. [Nginx — reverse proxy for the API](#4-nginx--reverse-proxy-for-the-api)
5. [SSL with Let's Encrypt (Certbot)](#5-ssl-with-lets-encrypt-certbot)
6. [Strategy A — UI on Cloudflare Workers](#6-strategy-a--ui-on-cloudflare-workers)
7. [Strategy B — UI on VPS (Node.js)](#7-strategy-b--ui-on-vps-nodejs)
8. [Environment variable reference](#8-environment-variable-reference)
9. [GitHub Actions CI/CD](#9-github-actions-cicd)
10. [Post-deploy checklist](#10-post-deploy-checklist)
11. [Maintenance commands](#11-maintenance-commands)

---

## 1. VPS prerequisites

### Minimum VPS specs
| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### DNS setup (do this first)

Point these records at your VPS IP before anything else. SSL won't issue without them.

```
A   api.yourdomain.com    →  <your-vps-ip>
A   yourdomain.com        →  <your-vps-ip>    (Strategy B only)
```

Replace `yourdomain.com` and `api.yourdomain.com` throughout this guide with your real domains.

### System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  git curl wget build-essential \
  python3 python3-pip python3-venv \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  ufw
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Create a dedicated system user (never run as root)

```bash
sudo useradd -m -s /bin/bash disciplinetrack
sudo passwd disciplinetrack          # set a strong password
sudo usermod -aG sudo disciplinetrack
su - disciplinetrack
```

---

## 2. PostgreSQL

```bash
# Switch to postgres system user
sudo -u postgres psql
```

Inside psql:
```sql
CREATE DATABASE disciplinetrack_db;
CREATE USER disciplinetrack_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
ALTER ROLE disciplinetrack_user SET client_encoding TO 'utf8';
ALTER ROLE disciplinetrack_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE disciplinetrack_user SET timezone TO 'Africa/Dar_es_Salaam';
GRANT ALL PRIVILEGES ON DATABASE disciplinetrack_db TO disciplinetrack_user;
\q
```

Test connection:
```bash
psql -U disciplinetrack_user -d disciplinetrack_db -h localhost -W
# Should open a psql prompt — then \q to exit
```

---

## 3. Django API — gunicorn + systemd

### 3.1 Clone and install

```bash
cd /home/disciplinetrack
git clone git@github.com:troubleman96/fingerprint-project-API.git API
cd API
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements/base.txt
pip install -r requirements/production.txt   # adds sentry-sdk
```

### 3.2 Create the production `.env` file

```bash
nano /home/disciplinetrack/API/.env
```

Paste and fill in every value:

```env
# Django
DJANGO_SECRET_KEY=GENERATE_WITH: python3 -c "import secrets; print(secrets.token_hex(64))"
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False
TIME_ZONE=Africa/Dar_es_Salaam

# Allowed hosts — comma-separated, no spaces
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com

# PostgreSQL
DATABASE_URL=postgres://disciplinetrack_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/disciplinetrack_db

# CORS — URL of the deployed UI (no trailing slash)
# Strategy A: your Cloudflare Workers URL (e.g. https://disciplinetrack.yourdomain.com)
# Strategy B: your VPS UI domain
CORS_ALLOWED_ORIGINS=https://disciplinetrack.yourdomain.com

# Media files
MEDIA_ROOT=/home/disciplinetrack/API/media
MEDIA_URL=/media/

# Sentry (optional — delete if not using)
SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

Lock down the file:
```bash
chmod 600 /home/disciplinetrack/API/.env
```

### 3.3 Initialise the database

```bash
cd /home/disciplinetrack/API
source venv/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser   # creates first ADMIN account

# Optional: load demo data (development only — skip in real production)
# python manage.py seed
```

`collectstatic` outputs to `staticfiles/`. Nginx will serve it directly.

### 3.4 Test gunicorn manually

```bash
cd /home/disciplinetrack/API
source venv/bin/activate

gunicorn config.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

Hit `http://127.0.0.1:8000/api/` from another terminal:
```bash
curl http://127.0.0.1:8000/api/
```

You should get a JSON 404 (the router has no root endpoint). That means Django is running. Press `Ctrl-C` to stop gunicorn.

### 3.5 Systemd service for gunicorn

```bash
sudo nano /etc/systemd/system/disciplinetrack-api.service
```

```ini
[Unit]
Description=DisciplineTrack Django API
After=network.target postgresql.service

[Service]
Type=notify
User=disciplinetrack
Group=disciplinetrack
WorkingDirectory=/home/disciplinetrack/API
EnvironmentFile=/home/disciplinetrack/API/.env
ExecStart=/home/disciplinetrack/API/venv/bin/gunicorn \
    config.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile /home/disciplinetrack/logs/api-access.log \
    --error-logfile  /home/disciplinetrack/logs/api-error.log
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the log directory and enable the service:

```bash
mkdir -p /home/disciplinetrack/logs

sudo systemctl daemon-reload
sudo systemctl enable disciplinetrack-api
sudo systemctl start disciplinetrack-api
sudo systemctl status disciplinetrack-api    # should show "active (running)"
```

---

## 4. Nginx — reverse proxy for the API

```bash
sudo nano /etc/nginx/sites-available/disciplinetrack-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Let Certbot handle the HTTPS redirect (added in §5)

    client_max_body_size 20M;    # allow student photo + document uploads

    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /admin/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/disciplinetrack/API/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /home/disciplinetrack/API/media/;
        expires 7d;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/disciplinetrack-api \
           /etc/nginx/sites-enabled/

sudo nginx -t                    # must print "syntax is ok"
sudo systemctl reload nginx
```

Test: `curl http://api.yourdomain.com/api/` — should return a JSON 404.

---

## 5. SSL with Let's Encrypt (Certbot)

```bash
# Issue certificate for the API domain
sudo certbot --nginx -d api.yourdomain.com

# Strategy B only — also issue for the UI domain
# sudo certbot --nginx -d yourdomain.com
```

Certbot automatically:
- Obtains a certificate from Let's Encrypt
- Edits the nginx config to add HTTPS and redirect HTTP → HTTPS
- Sets up automatic renewal (check with `sudo certbot renew --dry-run`)

After Certbot runs, test full HTTPS:
```bash
curl https://api.yourdomain.com/api/
```

---

## 6. Strategy A — UI on Cloudflare Workers

> Skip this section if you chose Strategy B.

This is the default build target — the Cloudflare plugin is already in `vite.config.ts`.

### 6.1 Configure Wrangler and the production env

In the UI repo on your **local machine**:

```bash
# Install Wrangler globally if not already present
npm install -g wrangler

# Authenticate with Cloudflare (opens a browser tab)
wrangler login
```

Edit `wrangler.jsonc` — set your Cloudflare account ID and a production routes/domain:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "disciplinetrack-ui",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts",
  "routes": [
    { "pattern": "disciplinetrack.yourdomain.com/*", "zone_name": "yourdomain.com" }
  ]
}
```

### 6.2 Set production environment variables

Cloudflare Workers use `wrangler secret` for sensitive values and `vars` in `wrangler.jsonc` for non-secret ones.

```bash
# Set the API URL (non-secret — goes in wrangler.jsonc vars block)
# Add to wrangler.jsonc:
# "vars": { "VITE_API_URL": "https://api.yourdomain.com" }

# Or set as a secret:
wrangler secret put VITE_API_URL
# → enter: https://api.yourdomain.com

# Fingerprint agent connects from each staff workstation, not the server
# No need to set VITE_FINGERPRINT_AGENT_URL here (defaults to ws://localhost:4444)
```

### 6.3 Build and deploy

```bash
cd UI
npm install
npm run build        # output goes to dist/

wrangler deploy      # deploys dist/ to Cloudflare Workers
```

The Workers URL will be printed. Set it in the Django `.env` on your VPS:
```
CORS_ALLOWED_ORIGINS=https://disciplinetrack.yourdomain.com
```

Then restart gunicorn:
```bash
sudo systemctl restart disciplinetrack-api
```

### 6.4 Custom domain (optional but recommended)

In the Cloudflare dashboard:
1. **Workers & Pages → disciplinetrack-ui → Triggers → Custom Domains**
2. Add `disciplinetrack.yourdomain.com`
3. Cloudflare handles SSL automatically

---

## 7. Strategy B — UI on VPS (Node.js)

> Skip this section if you chose Strategy A.

The Cloudflare plugin must be replaced with the Node.js server preset.

### 7.1 Modify vite.config.ts

On your **local machine**, edit [vite.config.ts](vite.config.ts):

```typescript
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
// Remove the Cloudflare import

export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        preset: "node-server",   // ← changed from Cloudflare
        entry: "server",
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    // Remove: cloudflare({ viteEnvironment: { name: "ssr" } }),
  ],
});
```

Commit and push this change before deploying.

### 7.2 Install Node.js on the VPS

```bash
# On the VPS — install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # should be v20.x.x
npm --version

# Install PM2 for process management
sudo npm install -g pm2
```

### 7.3 Clone, build, and configure

```bash
cd /home/disciplinetrack
git clone git@github.com:troubleman96/fingerprint-project.git UI
cd UI
npm install

# Create production env file
nano .env.production
```

`.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_FINGERPRINT_AGENT_URL=ws://localhost:4444
```

Build:
```bash
npm run build    # output in .output/ (node-server preset)
```

### 7.4 PM2 service

```bash
# Start the UI server
pm2 start .output/server/index.mjs \
  --name disciplinetrack-ui \
  --env production

# Save PM2 process list so it restarts on reboot
pm2 save
pm2 startup   # follow the printed instructions to enable on boot
```

### 7.5 Nginx config for the UI

```bash
sudo nano /etc/nginx/sites-available/disciplinetrack-ui
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # Serve Vite build assets with long-lived cache
    location /_build/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/disciplinetrack-ui \
           /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue SSL for the UI domain
sudo certbot --nginx -d yourdomain.com
```

---

## 8. Environment variable reference

### Django API (`/home/disciplinetrack/API/.env`)

| Variable | Required | Example | Notes |
|---|:---:|---|---|
| `DJANGO_SECRET_KEY` | ✅ | 128-char random hex | `python3 -c "import secrets; print(secrets.token_hex(64))"` |
| `DJANGO_SETTINGS_MODULE` | ✅ | `config.settings.production` | |
| `DEBUG` | ✅ | `False` | Must be False in production |
| `TIME_ZONE` | — | `Africa/Dar_es_Salaam` | Pytz timezone string |
| `ALLOWED_HOSTS` | ✅ | `api.yourdomain.com` | Comma-separated, no spaces |
| `DATABASE_URL` | ✅ | `postgres://user:pass@localhost:5432/db` | |
| `CORS_ALLOWED_ORIGINS` | ✅ | `https://disciplinetrack.yourdomain.com` | UI origin, no trailing slash |
| `MEDIA_ROOT` | — | `/home/disciplinetrack/API/media` | Absolute path |
| `MEDIA_URL` | — | `/media/` | Served by nginx |
| `SENTRY_DSN` | — | `https://...@sentry.io/...` | Optional error tracking |

### UI — Strategy A (Cloudflare Workers, set via wrangler)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `VITE_FINGERPRINT_AGENT_URL` | Not set on server — defaults to `ws://localhost:4444` on each workstation |

### UI — Strategy B (VPS, in `.env.production`)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `VITE_FINGERPRINT_AGENT_URL` | Not set on server — defaults to `ws://localhost:4444` on each workstation |

---

## 9. GitHub Actions CI/CD

### 9.1 API auto-deploy on push to main

Create `.github/workflows/deploy-api.yml` in the **API repo**:

```yaml
name: Deploy API

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: disciplinetrack
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/disciplinetrack/API
            git pull origin master
            source venv/bin/activate
            pip install -r requirements/base.txt -r requirements/production.txt
            python manage.py migrate --noinput
            python manage.py collectstatic --noinput
            sudo systemctl restart disciplinetrack-api
            echo "Deploy complete"
```

### 9.2 UI auto-deploy — Strategy A (Cloudflare Workers)

Create `.github/workflows/deploy-ui.yml` in the **UI repo**:

```yaml
name: Deploy UI to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 9.3 UI auto-deploy — Strategy B (VPS)

```yaml
name: Deploy UI to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Build
        run: |
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Upload build to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: disciplinetrack
          key: ${{ secrets.VPS_SSH_KEY }}
          source: ".output/"
          target: "/home/disciplinetrack/UI/"

      - name: Restart PM2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: disciplinetrack
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            pm2 restart disciplinetrack-ui
            echo "UI deploy complete"
```

### 9.4 Required GitHub secrets

Go to **Settings → Secrets and variables → Actions** in each repo and add:

| Secret | Description |
|---|---|
| `VPS_HOST` | IP or hostname of your VPS |
| `VPS_SSH_KEY` | Private key for the `disciplinetrack` user (generate with `ssh-keygen -t ed25519`) |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `CLOUDFLARE_API_TOKEN` | Strategy A only — from [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Strategy A only — from Cloudflare dashboard |

**Generate and install the SSH deploy key:**

```bash
# On your local machine:
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/disciplinetrack_deploy
cat ~/.ssh/disciplinetrack_deploy.pub

# On the VPS:
echo "PASTE_PUBLIC_KEY_HERE" >> /home/disciplinetrack/.ssh/authorized_keys
chmod 600 /home/disciplinetrack/.ssh/authorized_keys

# Add the private key (~/.ssh/disciplinetrack_deploy content) as VPS_SSH_KEY secret
```

---

## 10. Post-deploy checklist

Run through these after every initial deployment:

```
[ ] curl https://api.yourdomain.com/api/ returns a JSON response
[ ] curl https://api.yourdomain.com/admin/ loads the Django admin login page
[ ] UI loads at its production URL and the login page renders
[ ] Log in as admin — dashboard shows live data from the DB
[ ] Student list loads (GET /api/students/ returns 200)
[ ] Create a test student — verify it appears in the list
[ ] Cases list loads
[ ] Audit log shows the LOGIN entry for your test login
[ ] HTTPS certificate is valid (padlock in browser)
[ ] HTTP to HTTPS redirect works (curl http://api.yourdomain.com → 301)
[ ] File uploads work: upload a student photo and check it's served from /media/
[ ] CORS works: no "Access-Control-Allow-Origin" errors in browser console
[ ] Token refresh: stay logged in for >8 hours and confirm the session refreshes
```

---

## 11. Maintenance commands

### Django API

```bash
# Tail live logs
sudo journalctl -u disciplinetrack-api -f

# Restart after a code change
sudo systemctl restart disciplinetrack-api

# Run migrations after a model change
cd /home/disciplinetrack/API
source venv/bin/activate
python manage.py migrate

# Collect static files after CSS/JS changes
python manage.py collectstatic --noinput

# Open Django shell
python manage.py shell

# Create a new staff account from the command line
python manage.py createsuperuser

# Check gunicorn worker count (tune to 2×CPU+1)
systemctl cat disciplinetrack-api | grep workers
```

### Nginx

```bash
sudo nginx -t                      # test config before reloading
sudo systemctl reload nginx        # reload without dropping connections
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQL

```bash
# Connect to the DB
sudo -u postgres psql disciplinetrack_db

# Backup
pg_dump -U disciplinetrack_user disciplinetrack_db \
  > /backups/disciplinetrack_$(date +%Y%m%d).sql

# Restore
psql -U disciplinetrack_user disciplinetrack_db \
  < /backups/disciplinetrack_20260101.sql

# Automate daily backups (add to crontab)
crontab -e
# Add: 0 2 * * * pg_dump -U disciplinetrack_user disciplinetrack_db > /backups/dt_$(date +\%Y\%m\%d).sql
```

### UI — Strategy A (Cloudflare)

```bash
# Redeploy from local machine
npm run build && wrangler deploy

# View live logs (Cloudflare dashboard → Workers → disciplinetrack-ui → Logs)
wrangler tail
```

### UI — Strategy B (PM2 on VPS)

```bash
pm2 status                         # list all processes
pm2 logs disciplinetrack-ui        # tail logs
pm2 restart disciplinetrack-ui     # restart
pm2 reload disciplinetrack-ui      # zero-downtime reload
pm2 monit                          # interactive monitor
```

### SSL certificate renewal

Certbot auto-renews. To test:
```bash
sudo certbot renew --dry-run
```

### Fingerprint agent (per workstation — not the server)

```bash
# On each staff workstation with a scanner:
cd ~/disciplinetrack/agent
node index.js --mock          # demo
SDK_TYPE=secugen node index.js    # real hardware

# As a systemd service (see agent/README.md §13)
sudo systemctl status fingerprint-agent
sudo systemctl restart fingerprint-agent
sudo journalctl -u fingerprint-agent -f
```

---

## Troubleshooting

### `502 Bad Gateway` from nginx

Gunicorn is not running or listening on the wrong port.
```bash
sudo systemctl status disciplinetrack-api
sudo journalctl -u disciplinetrack-api -n 50
curl http://127.0.0.1:8000/api/   # test gunicorn directly
```

### `CORS policy` error in browser console

`CORS_ALLOWED_ORIGINS` in the API `.env` doesn't match the UI origin exactly.
```bash
# Must be exact — no trailing slash, correct protocol
grep CORS /home/disciplinetrack/API/.env
# e.g.: CORS_ALLOWED_ORIGINS=https://disciplinetrack.yourdomain.com
sudo systemctl restart disciplinetrack-api
```

### `DisallowedHost` error in Django logs

`ALLOWED_HOSTS` doesn't include the domain nginx is forwarding.
```bash
grep ALLOWED_HOSTS /home/disciplinetrack/API/.env
# Add: api.yourdomain.com
sudo systemctl restart disciplinetrack-api
```

### Static files return 404

`collectstatic` hasn't been run, or the nginx `alias` path is wrong.
```bash
cd /home/disciplinetrack/API
source venv/bin/activate
python manage.py collectstatic --noinput
ls staticfiles/   # should have admin/, rest_framework/, etc.
```

### Database connection refused

PostgreSQL is not running or the credentials are wrong.
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"    # list databases
psql -U disciplinetrack_user -d disciplinetrack_db -h localhost -W
```

### Media files (student photos) not served

The nginx `alias` for `/media/` must match `MEDIA_ROOT` in `.env`.
```bash
grep MEDIA /home/disciplinetrack/API/.env
# MEDIA_ROOT=/home/disciplinetrack/API/media
# Check nginx alias matches this path
```
