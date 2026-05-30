# DisciplineTrack — UI & Agent VPS Deployment

This guide covers deploying **only** the React frontend (UI) to a VPS and setting up the fingerprint agent on staff workstations. For the full system including the Django API see [deploy.md](deploy.md).

---

## Overview

```
Internet
    │
    ▼
Nginx (443 / HTTPS)             ← your VPS
    │
    ▼
Node.js UI server               ← runs on the VPS, port 3000
(TanStack Start — SSR)
    │
    ▼
Django API                      ← your API VPS (or same VPS)
https://api.yourdomain.com

─────────────────────────────────────────────────────────

Staff workstation               ← every PC with a scanner
    │
    ├── Browser → https://yourdomain.com   (loads from VPS)
    │
    └── ws://localhost:4444
            │
            ▼
        agent/index.js          ← runs locally on the workstation
            │
            ▼
        USB Fingerprint Scanner
```

> **The fingerprint agent always runs on each staff workstation — never on the server.** Raw biometric template data must never leave the local machine.

---

## What you need

| Item | Requirement |
|---|---|
| VPS OS | Ubuntu 22.04 LTS |
| VPS RAM | 512 MB minimum, 1 GB recommended |
| VPS CPU | 1 vCPU is fine for the UI alone |
| Node.js (VPS) | 20 LTS |
| Node.js (workstations) | 18+ for the agent |
| Domain | `yourdomain.com` pointed at the VPS IP |

---

## Part 1 — VPS: deploy the UI

### Step 1 — Switch from Cloudflare Workers to Node.js server

The repo originally shipped with the `@cloudflare/vite-plugin`. **This change has already been applied** — `vite.config.ts` no longer contains the Cloudflare plugin.

For reference, the change was:

```diff
 import { defineConfig } from "vite";
 import { tanstackStart } from "@tanstack/react-start/plugin/vite";
 import react from "@vitejs/plugin-react";
 import tailwindcss from "@tailwindcss/vite";
 import tsconfigPaths from "vite-tsconfig-paths";
-import { cloudflare } from "@cloudflare/vite-plugin";

 export default defineConfig({
   plugins: [
     tanstackStart({
       server: { entry: "server" },
     }),
     react(),
     tailwindcss(),
     tsconfigPaths({ projects: ["./tsconfig.json"] }),
-    cloudflare({ viteEnvironment: { name: "ssr" } }),
   ],
 });
```

TanStack Start 1.168.x defaults to a Node.js-compatible output when the Cloudflare plugin is absent. No `preset` field is needed — it is not part of this version's API.

---

### Step 2 — VPS setup

```bash
# SSH into your VPS
ssh root@<your-vps-ip>

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx ufw

node --version    # must be v20.x.x

# Install PM2 (process manager)
sudo npm install -g pm2

# Create a system user
sudo useradd -m -s /bin/bash dt-ui
sudo usermod -aG sudo dt-ui

# Allow nginx through the firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### Step 3 — Clone and build on the VPS

```bash
su - dt-ui
cd /home/dt-ui

git clone git@github.com:troubleman96/fingerprint-project.git UI
cd UI
npm install
```

Create the production environment file:

```bash
nano /home/dt-ui/UI/.env.production
```

```env
# URL of your running Django API — no trailing slash
VITE_API_URL=https://api.yourdomain.com

# Fingerprint agent — always ws://localhost:4444 on staff workstations
# Do NOT change this; it connects from the browser to the local workstation agent
VITE_FINGERPRINT_AGENT_URL=ws://localhost:4444
```

Build:

```bash
npm run build
```

The output lands in `.output/`:
- `.output/server/index.mjs` — the Node.js SSR server
- `.output/public/` — static assets (JS, CSS, images)

Test it manually before wiring up PM2:

```bash
PORT=3000 node .output/server/index.mjs
# Open another terminal: curl http://localhost:3000 — should return HTML
# Ctrl-C when done
```

---

### Step 4 — PM2 service

```bash
# Create a PM2 ecosystem file
nano /home/dt-ui/UI/ecosystem.config.cjs
```

```js
module.exports = {
  apps: [
    {
      name: "disciplinetrack-ui",
      script: ".output/server/index.mjs",
      cwd: "/home/dt-ui/UI",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
        VITE_API_URL: "https://api.yourdomain.com",
        VITE_FINGERPRINT_AGENT_URL: "ws://localhost:4444",
      },
    },
  ],
};
```

Start and persist:

```bash
cd /home/dt-ui/UI
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # prints a command — run it as root to enable on reboot
```

Check status:

```bash
pm2 status
pm2 logs disciplinetrack-ui --lines 30
```

---

### Step 5 — Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/disciplinetrack-ui
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Certbot will insert the HTTPS redirect block here (Step 6)

    # Proxy all requests to the Node.js server
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 30s;
    }

    # Vite build assets have content-addressed filenames — cache them forever
    location /_build/ {
        proxy_pass         http://127.0.0.1:3000;
        expires            1y;
        add_header         Cache-Control "public, immutable";
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/disciplinetrack-ui \
           /etc/nginx/sites-enabled/

sudo nginx -t                  # must say "syntax is ok"
sudo systemctl reload nginx
```

Test: `curl http://yourdomain.com` — should return HTML.

---

### Step 6 — SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot adds the HTTPS block and HTTP → HTTPS redirect automatically.

Test renewal:
```bash
sudo certbot renew --dry-run
```

Visit `https://yourdomain.com` in your browser — you should see the DisciplineTrack login page.

---

### Step 7 — DNS

Make sure these A records exist (replace `<VPS-IP>` with your server's IP):

```
A   yourdomain.com       →  <VPS-IP>
A   www.yourdomain.com   →  <VPS-IP>
```

If the API is on a different server or subdomain:
```
A   api.yourdomain.com   →  <API-VPS-IP>
```

---

## Part 2 — Workstation: deploy the fingerprint agent

The agent runs on every staff workstation that has a USB fingerprint scanner. Install it once on each machine.

### Step 1 — Install Node.js on the workstation

**Windows:**
1. Download and install from [nodejs.org](https://nodejs.org/) — choose v20 LTS
2. Open PowerShell and confirm: `node --version`

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

---

### Step 2 — Get the agent code

Option A — copy from the repo:
```bash
git clone git@github.com:troubleman96/fingerprint-project.git disciplinetrack
cd disciplinetrack/UI/agent
npm install
```

Option B — copy just the `agent/` folder to the workstation via USB or network share. Then:
```bash
cd agent
npm install
```

---

### Step 3 — Test mock mode (no hardware required)

```bash
node index.js --mock
```

Expected output:
```
[agent] Fingerprint agent running on ws://127.0.0.1:4444
[agent] Mode: MOCK (demo)
[agent] Match threshold: 0.6
```

Open the DisciplineTrack UI at `https://yourdomain.com` and go to **Biometric Auth → Enroll**. The amber "Agent offline" banner should turn green: **"Mock Scanner (demo mode) ready"**.

---

### Step 4 — Connect a real scanner

See [agent/README.md](agent/README.md) §7 for full per-vendor instructions. Quick reference:

| Scanner | Steps |
|---|---|
| **SecuGen FDU04** (most common) | Install driver → copy `libsgfplib.so`/`SGFPM.dll` to `agent/` → `npm install node-ffi-napi ref-napi ref-struct-di` → wire FFI in `SecuGenScanner` block → `SDK_TYPE=secugen node index.js` |
| **Mantra MFS100** | Install driver → copy `libmfs100.so`/`mfs100.dll` → wire `MantraScanner` block → `SDK_TYPE=mantra node index.js` |
| **Any other** | Implement the 4-method interface in `index.js` (see [agent/README.md §15](agent/README.md#15-extending-to-a-new-scanner-model)) |

---

### Step 5 — Run the agent automatically on startup

#### Windows — Task Scheduler

1. Open **Task Scheduler → Create Basic Task**
2. Name: `DisciplineTrack Fingerprint Agent`
3. Trigger: **When the computer starts**
4. Action: **Start a program**
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\disciplinetrack\UI\agent\index.js`
   - Start in: `C:\disciplinetrack\UI\agent`
5. Check **Run whether user is logged on or not**
6. Check **Run with highest privileges**

Or via PowerShell (run as Administrator):
```powershell
$action  = New-ScheduledTaskAction -Execute "node.exe" `
             -Argument "C:\disciplinetrack\UI\agent\index.js" `
             -WorkingDirectory "C:\disciplinetrack\UI\agent"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartOnIdle -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName "DisciplineTrackAgent" `
  -Action $action -Trigger $trigger -Settings $settings `
  -RunLevel Highest -Force
```

#### Ubuntu/Debian — systemd

```bash
sudo nano /etc/systemd/system/fingerprint-agent.service
```

```ini
[Unit]
Description=DisciplineTrack Fingerprint Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/disciplinetrack/UI/agent
ExecStart=/usr/bin/node /home/$USER/disciplinetrack/UI/agent/index.js
Environment=SDK_TYPE=secugen
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable fingerprint-agent
sudo systemctl start fingerprint-agent
sudo systemctl status fingerprint-agent
```

#### macOS — launchd

```bash
nano ~/Library/LaunchAgents/com.disciplinetrack.agent.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>        <string>com.disciplinetrack.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/YOURUSERNAME/disciplinetrack/UI/agent/index.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SDK_TYPE</key><string>secugen</string>
  </dict>
  <key>WorkingDirectory</key>
  <string>/Users/YOURUSERNAME/disciplinetrack/UI/agent</string>
  <key>RunAtLoad</key>  <true/>
  <key>KeepAlive</key>  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.disciplinetrack.agent.plist
```

---

## Part 3 — Keeping the UI updated

### Manual update on the VPS

```bash
su - dt-ui
cd /home/dt-ui/UI

git pull origin main
npm install            # only needed if package.json changed
npm run build
pm2 restart disciplinetrack-ui
```

### Automatic update via GitHub Actions

Create `.github/workflows/deploy-ui.yml` in the repo:

```yaml
name: Deploy UI

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
          username: dt-ui
          key: ${{ secrets.VPS_SSH_KEY }}
          source: ".output/"
          target: "/home/dt-ui/UI/"
          rm: true

      - name: Restart PM2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: dt-ui
          key: ${{ secrets.VPS_SSH_KEY }}
          script: pm2 restart disciplinetrack-ui && pm2 save
```

**Required GitHub secrets:**

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP or hostname |
| `VPS_SSH_KEY` | Private key for the `dt-ui` user |
| `VITE_API_URL` | `https://api.yourdomain.com` |

Generate and install the deploy key:
```bash
# Local machine:
ssh-keygen -t ed25519 -C "github-ui-deploy" -f ~/.ssh/dt_ui_deploy

# VPS (as dt-ui):
echo "PASTE_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add private key content to GitHub secret VPS_SSH_KEY
```

---

## Quick-reference commands

### VPS — UI server

```bash
pm2 status                          # check running
pm2 logs disciplinetrack-ui         # tail logs
pm2 restart disciplinetrack-ui      # restart
pm2 reload disciplinetrack-ui       # zero-downtime reload

sudo systemctl reload nginx         # reload nginx config
sudo nginx -t                       # validate nginx config
sudo certbot renew --dry-run        # test SSL renewal
```

### Workstation — fingerprint agent

```bash
# Check if agent is running
lsof -i :4444                       # Linux/macOS
netstat -ano | findstr 4444         # Windows

# Start manually (debug mode)
node index.js --mock                # demo — no scanner needed
SDK_TYPE=secugen node index.js      # real SecuGen scanner

# View systemd logs (Linux)
sudo journalctl -u fingerprint-agent -f

# Verify DB has enrolled templates
sqlite3 templates.db "SELECT reg_number, finger, enrolled_at FROM templates;"
```

---

## Troubleshooting

### UI login page shows but API calls fail

Check `CORS_ALLOWED_ORIGINS` in the Django `.env` on the API server — it must exactly match the UI origin:
```
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### White screen / 500 after deploy

```bash
pm2 logs disciplinetrack-ui --lines 50
```
Usually a missing env variable or a build that didn't complete. Rebuild:
```bash
cd /home/dt-ui/UI && npm run build && pm2 restart disciplinetrack-ui
```

### "Agent offline" banner won't go away

The browser can't reach `ws://localhost:4444` on the workstation.
1. Confirm the agent is running on **this workstation** (not the server)
2. `lsof -i :4444` — if empty, start the agent
3. Try `node index.js --mock` first to confirm basic connectivity
4. On Windows: check that the Windows Firewall isn't blocking port 4444 on the loopback interface

### PM2 process not starting after reboot

```bash
pm2 startup                  # prints a command — run it as root
pm2 save                     # save the current process list
```
