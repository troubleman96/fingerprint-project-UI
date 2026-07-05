# DisciplineTrack — Local Fingerprint Bridge Agent

A small Node.js process that runs on any workstation with a USB fingerprint scanner attached. It exposes a **WebSocket server on `ws://localhost:4444`** that the DisciplineTrack web app connects to for real-hardware enrollment and 1:N verification.

---

## Table of Contents

1. [Why a local agent exists](#1-why-a-local-agent-exists)
2. [How it fits into the system](#2-how-it-fits-into-the-system)
3. [Quick start — mock mode (no hardware)](#3-quick-start--mock-mode-no-hardware)
4. [Prerequisites](#4-prerequisites)
5. [Installation](#5-installation)
6. [Configuration](#6-configuration)
7. [Supported scanners and SDK wiring](#7-supported-scanners-and-sdk-wiring) (incl. [Chipsailing CS9711](#7d-chipsailing-cs9711-the-scanner-currently-on-this-workstation) — Linux + Windows setup)
8. [Enrollment flow (step by step)](#8-enrollment-flow-step-by-step)
9. [Verification flow (step by step)](#9-verification-flow-step-by-step)
10. [WebSocket protocol reference](#10-websocket-protocol-reference)
11. [Local template database](#11-local-template-database)
12. [Security model](#12-security-model)
13. [Running as a background service](#13-running-as-a-background-service)
14. [Troubleshooting](#14-troubleshooting)
15. [Extending to a new scanner model](#15-extending-to-a-new-scanner-model)

---

## 1. Why a local agent exists

### The problem with hashing raw scans

The DisciplineTrack API stores a **SHA256 hash** of each enrolled fingerprint template. During verification, the API does an exact string lookup:

```sql
SELECT * FROM biometric_templates WHERE template_hash = ?
```

This only works if the verification scan produces an **identical** hash to the enrollment scan.

**Real scanners never produce identical templates twice.** A fingerprint captured twice from the same finger will differ slightly — the student placed their finger at a slightly different angle, pressed with more or less force, or their skin moisture changed. These small differences make SHA256 of scan 1 completely different from SHA256 of scan 2.

Every fingerprint vendor SDK ships a native `match(template_a, template_b)` function that computes a **similarity score** (typically 0.0–1.0 or 0–200,000 depending on the vendor) and determines a match above a configurable threshold. This matching algorithm is trained on thousands of real scans and tolerates normal variation.

### Why matching cannot happen in the browser

- **WebUSB** gives browsers access to USB devices but has very limited protocol support. Fingerprint scanners communicate over proprietary HID or serial protocols not exposed via WebUSB.
- **No native code execution** — browsers cannot load vendor `.dll` or `.so` SDK files.
- **Security** — raw biometric data (template binaries) should never be transmitted over a network. Keeping matching on the workstation means raw biometric data never leaves the local machine.

### The solution: local bridge agent

The agent is installed once on each workstation that has a scanner. It:

1. Loads the vendor SDK via `node-ffi-napi` (a native FFI bridge for Node.js)
2. Captures fingerprints from the USB device
3. Extracts a **template binary** using the SDK
4. For **enrollment**: SHA256-hashes the template → stores the binary locally + sends the hash to the browser → browser POSTs hash to Django
5. For **verification**: captures a live template → runs 1:N matching against all locally stored templates using the SDK → finds the closest match → sends the **already-stored hash** of the matched student to the browser → browser POSTs that known hash to Django for identity confirmation

```
Raw biometric data path:
  Scanner → Agent (template binary — never leaves this machine)

Hash path (non-reversible):
  Agent → Browser → Django API → Database
```

---

## 2. How it fits into the system

```
┌─────────────────────────────────────────────────────────────────┐
│  DisciplineTrack Web App  (React, localhost:5173)                │
│                                                                  │
│  src/hooks/useFingerprint.ts                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  connects to ws://localhost:4444                          │   │
│  │  sends:    start_enroll / start_verify / cancel / ping   │   │
│  │  receives: pong / finger_placed / enroll_complete / ...  │   │
│  └──────────────────────────┬─────────────────────────────-─┘   │
│                             │ WebSocket (localhost only)         │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  agent/index.js  (Node.js process on workstation)                │
│                                                                  │
│  ┌────────────────────────┐   ┌──────────────────────────────┐  │
│  │  WebSocket server      │   │  Scanner abstraction layer   │  │
│  │  port 4444             │   │                              │  │
│  │  127.0.0.1 only        │   │  MockScanner  (--mock flag)  │  │
│  └────────────────────────┘   │  SecuGenScanner              │  │
│                               │  MantraScanner               │  │
│  ┌────────────────────────┐   │  (add your own here)         │  │
│  │  templates.db          │   └──────────────┬───────────────┘  │
│  │  (better-sqlite3)      │                  │ node-ffi-napi    │
│  │  hash | template_blob  │                  │ (native FFI)     │
│  │  reg_number | finger   │   ┌──────────────▼───────────────┐  │
│  └────────────────────────┘   │  Vendor SDK (.dll / .so)     │  │
│                               └──────────────┬───────────────┘  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │ USB
                                ┌──────────────▼───────────────┐
                                │  USB Fingerprint Scanner      │
                                │  (SecuGen FDU04, Mantra       │
                                │   MFS100, ZKTeco SLK20R, ...) │
                                └───────────────────────────────┘
```

---

## 3. Quick start — mock mode (no hardware)

The agent runs in **mock mode** when no scanner is available. Scans are simulated with realistic 1.5-second delays. This is the default for development and demo environments.

```bash
cd agent
npm install
node index.js --mock
```

Expected output:
```
[agent] Fingerprint agent running on ws://127.0.0.1:4444
[agent] Mode: MOCK (demo)
[agent] Match threshold: 0.6
```

The web app will show the green **"Mock Scanner (demo mode) ready"** banner in the biometric pages, indicating the connection succeeded.

---

## 4. Prerequisites

### All platforms
- **Node.js 18 or later** — `node --version`
- **npm 9+** — `npm --version`

### For real hardware (non-mock)
- **USB fingerprint scanner** — see [§7](#7-supported-scanners-and-sdk-wiring) for supported models
- **Scanner driver** installed on the OS (see vendor instructions)
- **Vendor SDK shared library** (`.dll` on Windows, `.so` on Linux) placed in the `agent/` directory
- `node-ffi-napi`, `ref-napi`, `ref-struct-di` Node.js packages (handled by `npm install` as optional deps when build tools are available)

---

## 5. Installation

```bash
# From the repo root
cd agent
npm install
```

`npm install` installs:
- `ws` — WebSocket server
- `better-sqlite3` — local SQLite for template cache
- `node-ffi-napi`, `ref-napi`, `ref-struct-di` — optional, only needed for real hardware FFI; installation is skipped gracefully if native build tools are unavailable

---

## 6. Configuration

All configuration is via environment variables or CLI flags.

| Variable | CLI flag | Default | Description |
|---|---|---|---|
| `FINGERPRINT_MOCK=1` | `--mock` | off | Force mock mode regardless of `SDK_TYPE` |
| `SDK_TYPE` | — | `mock` | `secugen` / `mantra` / `fprintd` / `mock` |
| `AGENT_PORT` | `--port <n>` | `4444` | WebSocket listen port |
| `MATCH_THRESHOLD` | — | `0.6` | Minimum match score (0.0–1.0) to accept as a positive match |
| `API_BASE` | — | `http://localhost:8000/api` | Django API base URL (reserved for future template sync) |

### Examples

```bash
# Mock mode, default port
node index.js --mock

# SecuGen scanner on port 4444
SDK_TYPE=secugen node index.js

# Mantra scanner on custom port
SDK_TYPE=mantra AGENT_PORT=5555 node index.js

# Lower match threshold for worn fingerprints (elderly users)
SDK_TYPE=secugen MATCH_THRESHOLD=0.45 node index.js
```

---

## 7. Supported scanners and SDK wiring

The agent has an **abstraction layer** — add a new class with `open()`, `close()`, `capture(finger)`, and `match(live, stored)` methods to support any scanner.

### 7a. SecuGen (FDU02 / FDU04 / FDU05 / Hamster Pro)

Most common in East African educational institutions.

**Step 1 — Install the driver**

| OS | Package |
|---|---|
| Windows 10/11 | `SGFPLIB_SDK_x64.exe` from [secugen.com/downloads](https://secugen.com/downloads) |
| Ubuntu/Debian | `sudo dpkg -i sgfplib_2.x.x_amd64.deb` |
| CentOS/RHEL | `sudo rpm -i sgfplib-2.x.x.x86_64.rpm` |

**Step 2 — Copy the shared library**

| OS | File | Copy to |
|---|---|---|
| Windows | `SGFPM.dll` | `agent/SGFPM.dll` |
| Linux | `libsgfplib.so` | `agent/libsgfplib.so` |

**Step 3 — Install FFI packages**

```bash
cd agent
npm install node-ffi-napi ref-napi ref-struct-di
```

**Step 4 — Wire the FFI calls**

Open `agent/index.js` and find the `SecuGenScanner` object. Replace the stub comments with real SDK calls using the SecuGen SDK reference manual:

```javascript
// Key functions to wire:
// SGFPM_Create(&hFpm)
// SGFPM_Init(hFpm, SGFDX_ERROR_NONE)
// SGFPM_OpenDevice(hFpm, deviceId)
// SGFPM_GetImageEx(hFpm, imageBuffer, timeout, callback, brightness)
// SGFPM_CreateTemplate(hFpm, minTemplate, imageBuffer, templateBuffer)
// SGFPM_GetImageQuality(hFpm, imageBuffer, &quality)
// SGFPM_MatchTemplate(hFpm, t1, t2, SGFPM_FAKE_DETECT_DISABLE, &score)
//   score is 0–200000; divide by 200000 to normalise to 0–1
```

**Step 5 — Run**

```bash
SDK_TYPE=secugen node index.js
```

---

### 7b. Mantra MFS100 / MFS110

Common in India and East Africa.

**Step 1 — Download SDK** from [mantratecapp.com](https://www.mantratecapp.com/):
- Windows: `MFS100_SDK.zip` → extract `mfs100.dll`
- Linux: `libmfs100.so`

Copy to `agent/`.

**Step 2 — Install FFI packages**

```bash
npm install node-ffi-napi ref-napi ref-struct-di
```

**Step 3 — Wire the FFI calls in `MantraScanner`**

Key Mantra SDK functions:
```
MFS100_Init()
MFS100_GetImage(pBuffer, pQuality)
MFS100_ExtractMinTemplate(pImage, pTemplate, &nTemplateLen)
MFS100_MatchTemplate(pTemplate1, nLen1, pTemplate2, nLen2, &nScore)
  score 0–100; divide by 100 to normalise
MFS100_Exit()
```

---

### 7c. ZKTeco SLK20R / Live20R

**Step 1** — Download ZKFinger SDK from [zkteco.com](https://www.zkteco.com)

**Step 2** — Copy `libzkfp.so` (Linux) or `zkfp2.dll` (Windows) to `agent/`

**Step 3** — Implement a `ZKTecoScanner` class in `index.js` following the same pattern as `SecuGenScanner`.

Key ZK SDK functions: `ZKFPM_Init`, `ZKFPM_OpenDevice`, `ZKFPM_AcquireFingerprint`, `ZKFPM_ExtractEx`, `ZKFPM_Match`.

---

### 7d. Chipsailing CS9711 (the scanner currently on this workstation)

**Device name:** `Chipsailing CS9711Fingprint` (yes, "Fingprint" — that's the actual string reported by the hardware), made by ChipSailing Electronics (Shenzhen) Co., Ltd. USB ID `2541:0236`. It's a budget capacitive USB fingerprint dongle with no public vendor SDK — Windows only ships a WHQL driver for it (§7d-Windows below), and there is no `libsgfplib`/`libzkfp`-style shared library to FFI against on Linux. It also has a **thermal cutoff**: after several scans in quick succession you'll see `Device disabled to prevent overheating` — this is the hardware protecting itself, not a bug. Space out enroll/verify attempts by a few seconds and it recovers in a minute or two.

It identifies itself as a USB **vendor-specific class** device (bulk transfer endpoints, not HID), which is why generic OS drivers can't talk to it directly.

#### 7d-i. How it works — "match-on-host"

Unlike SecuGen/Mantra/ZKTeco (which do matching *inside* the sensor and hand you an opaque template + a `match()` score), the CS9711 is a **match-on-host** sensor: it streams a raw ~80×80 grayscale image to the PC and does *no* matching itself. All of the fingerprint comparison work — feature extraction, matching — runs in software on the host machine.

#### 7d-ii. Linux setup — how this was actually done

There is no vendor Linux SDK. Instead, a community-maintained fork of **libfprint** ([`archeYR/libfprint-CS9711`](https://github.com/archeYR/libfprint-CS9711), continuing `ddlsmurf`'s original driver) adds CS9711 support by feeding the raw image into an OpenCV-based feature matcher ("sigfm") and plugging it into Linux's standard fingerprint stack — `libfprint` + `fprintd` (the same D-Bus service used for laptop-integrated fingerprint readers). The driver's own maintainer warns: *"should not be used for anything serious without serious testing"* — treat it as good enough for development/demo, not production-grade certainty.

**1. Install build dependencies**

```bash
sudo apt update && sudo apt install -y \
  git build-essential meson ninja-build cmake \
  libnss3-dev libgudev-1.0-dev libgusb-dev libpixman-1-dev libssl-dev \
  libopencv-dev doctest-dev libcairo2-dev libgirepository1.0-dev gobject-introspection \
  fprintd libpam-fprintd
```

**2. Clone and build the driver**

```bash
git clone https://github.com/archeYR/libfprint-CS9711.git
cd libfprint-CS9711
meson setup build -Ddoc=false   # -Ddoc=false skips gtk-doc, which isn't needed to run
ninja -C build
sudo ninja -C build install
sudo ldconfig
sudo systemctl restart fprintd
```

Installing puts the new `libfprint-2.so.2` under `/usr/local/lib/...`, which `ldconfig -p` resolves *before* the distro's own `/usr/lib/...` copy — confirm with `ldconfig -p | grep libfprint-2.so` that the `/usr/local/lib` entry comes first, otherwise `fprintd` will keep loading the old library with no CS9711 support and restarting it won't pick up the change.

**3. Confirm the device is recognized**

```bash
fprintd-list "$USER"
# found 1 devices
# ...
# User <you> has no fingers enrolled for Chipsailing CS9711Fingprint.
```

**4. Known gotcha — polkit denies enrollment from non-desktop sessions**

If `fprintd-enroll` fails immediately with `EnrollStart failed: Timeout was reached`, check `journalctl -u fprintd`. If it shows:

```
Authorization denied ... Not Authorized: net.reactivated.fprint.device.enroll
```

it means polkit doesn't consider the calling session "active" (this happens over SSH, in some automation/CI shells, etc. — normal desktop terminal sessions usually aren't affected). Fix by adding a local polkit rule scoped to your own user:

```bash
# /etc/polkit-1/rules.d/49-fprintd-<username>.rules
polkit.addRule(function(action, subject) {
    if ((action.id == "net.reactivated.fprint.device.enroll" ||
         action.id == "net.reactivated.fprint.device.verify" ||
         action.id == "net.reactivated.fprint.device.setusername") &&
        subject.user == "<username>") {
        return polkit.Result.YES;
    }
});
```

```bash
sudo systemctl restart polkit
```

This only grants that one user permission to manage their *own* fingerprints — it doesn't weaken any other policy.

**5. Test with the standard Linux fingerprint tools**

```bash
fprintd-enroll -f right-index-finger   # touch the sensor ~10-15 times when prompted
fprintd-verify -f right-index-finger   # touch again to confirm a match
```

**6. Run the agent against it**

```bash
SDK_TYPE=fprintd node index.js
# or: npm run start:fprintd
```

Because `fprintd` only exposes 10 named finger slots per Linux user (`left-thumb` … `right-little-finger`) and never hands out raw template bytes for offline comparison, `SDK_TYPE=fprintd` in `index.js` works differently from the other scanners:
- **Enroll** claims the next free slot and runs `fprintd-enroll -f <slot>` for the new student.
- **Verify** loops over every enrolled slot and runs `fprintd-verify -f <slot>` (a fresh live re-scan each time) until one reports `verify-match`.

Practical consequence: **this workstation can hold at most 10 enrolled people at a time** through this path — a Linux/fprintd limitation, not something fixable in `index.js`. It's fine for a classroom demo; a production rollout with a real vendor SDK (SecuGen/Mantra/ZKTeco) wouldn't have this ceiling.

#### 7d-iii. Windows setup

On Windows this device is **Windows Hello / WBF (Windows Biometric Framework) certified** — that's why it can unlock the screen out of the box. The OEM driver ("ChipSailing Fingerprint UsbDriver", USB\VID_2541&PID_0236) usually installs automatically via Windows Update; if it doesn't (seen on some Windows 11 builds), download it manually from the [Microsoft Update Catalog](https://www.catalog.update.microsoft.com/) by searching the hardware ID, or via Device Manager → the unrecognized device → *Update driver*.

Once installed:
- **Settings → Accounts → Sign-in options → Fingerprint (Windows Hello)** lets you enroll and use it for Windows login/unlock — this is the "worked to unlock screen" behavior already observed.

**Important limitation:** unlike Linux (where the community driver exposes the sensor through `fprintd`, which this agent can drive), there is **no known public raw SDK for the CS9711 on Windows** — only the WHQL/WBF driver that feeds into Windows' own credential system. That means, as of this writing, **`agent/index.js` cannot talk to this specific device on Windows** the way it does on Linux. Options for a Windows workstation:
1. Use a scanner with a real published SDK — the agent already has stubs for **SecuGen** and **Mantra** (§7a/§7b) — and wire those up per their vendor docs.
2. Request the raw capture SDK directly from ChipSailing/your hardware reseller (OEM fingerprint chip makers sometimes provide one under NDA to integrators, even when it isn't public) and add a `ChipsailingScanner` in `index.js` following the same `open()/close()/capture()/match()` pattern as the existing scanners (§15).
3. Run the agent in `--mock` mode on Windows workstations for now, and reserve the real CS9711 hardware path for Linux workstations.

---

### 7e. Mock (development / demo)

No hardware, no SDK, no FFI. Uses `crypto.randomBytes(512)` as a synthetic template. Enrollment always succeeds; verification always matches the first enrolled template. Use `--mock` or `SDK_TYPE=mock`.

---

## 8. Enrollment flow (step by step)

```
Web App (browser)                  Agent                     Scanner
     │                               │                          │
     │  { type: "start_enroll",      │                          │
     │    finger: "right_index" }    │                          │
     │──────────────────────────────►│                          │
     │                               │  scanner.capture()       │
     │  { type: "status",            │─────────────────────────►│
     │    state: "waiting" }         │                          │
     │◄──────────────────────────────│  (student places finger) │
     │                               │                          │
     │  { type: "finger_placed" }    │  template binary         │
     │◄──────────────────────────────│◄─────────────────────────│
     │                               │                          │
     │                               │  sha256(template) = HASH │
     │                               │  INSERT INTO templates   │
     │                               │  (HASH, binary, finger)  │
     │                               │                          │
     │  { type: "enroll_complete",   │                          │
     │    template_hash: "abc...",   │                          │
     │    quality_score: 0.95,       │                          │
     │    finger_used: "right_index"}│                          │
     │◄──────────────────────────────│                          │
     │                               │                          │
     │  POST /api/biometric/enroll/  │                          │
     │  { reg_number,                │                          │
     │    template_hash: "abc...",   │                          │
     │    quality_score: 0.95,       │                          │
     │    finger_used: "right_index"}│                          │
     │──────────────────────────────────────────────────────► Django
     │  200 { success: true }        │                          │
     │◄──────────────────────────────────────────────────────────│
```

**Important:** The template binary goes into `templates.db` on this machine only. The hash goes to Django. If `templates.db` is lost, affected students must re-enroll.

---

## 9. Verification flow (step by step)

```
Web App (browser)                  Agent                     Scanner
     │                               │                          │
     │  { type: "start_verify" }     │                          │
     │──────────────────────────────►│                          │
     │  { type: "status",            │  scanner.capture()       │
     │    state: "waiting" }         │─────────────────────────►│
     │◄──────────────────────────────│                          │
     │                               │  (student places finger) │
     │  { type: "finger_placed" }    │  live template binary    │
     │◄──────────────────────────────│◄─────────────────────────│
     │                               │                          │
     │  { type: "status",            │  for each row in         │
     │    state: "processing" }      │  templates.db:           │
     │◄──────────────────────────────│    score = sdk.match(    │
     │                               │      live, stored)       │
     │                               │  → find best_match       │
     │                               │                          │
     │  IF score >= MATCH_THRESHOLD: │                          │
     │  { type: "verify_complete",   │  ← the STORED hash,      │
     │    template_hash: "abc...",   │    not the live hash     │
     │    score: 0.97 }              │                          │
     │◄──────────────────────────────│                          │
     │                               │                          │
     │  POST /api/biometric/verify/  │                          │
     │  { template_hash: "abc..." }  │                          │
     │──────────────────────────────────────────────────────► Django
     │  200 { data: { student_id,    │                          │
     │    reg_number, full_name,     │                          │
     │    department } }             │                          │
     │◄──────────────────────────────────────────────────────────│
     │                               │                          │
     │  IF score < MATCH_THRESHOLD:  │                          │
     │  { type: "verify_no_match" }  │                          │
     │◄──────────────────────────────│                          │
```

The key insight: during verification the agent sends back the **hash that was stored at enrollment time** — not the SHA256 of the live scan (which would be different). This is why the Django exact-hash lookup works correctly.

---

## 10. WebSocket protocol reference

The agent listens on `ws://127.0.0.1:4444`. All messages are JSON strings.

### Browser → Agent

| Message | When | Fields |
|---|---|---|
| `ping` | On connect; every 30 s for keepalive | — |
| `start_enroll` | User clicks "Scan Fingerprint" on enroll page | `finger: string` (e.g. `"right_index"`) |
| `start_verify` | User clicks "Scan to Identify" | — |
| `cancel` | User clicks Cancel or navigates away during a scan | — |

### Agent → Browser

| Message | Meaning | Key fields |
|---|---|---|
| `pong` | Response to ping — confirms agent is alive | `version: string`, `scanner: string` |
| `status` | State machine transition | `state: FingerprintState` |
| `finger_placed` | Sensor detected contact — scan in progress | — |
| `finger_lifted` | Sensor lost contact (intermediate event) | — |
| `quality_warning` | Image quality below acceptable threshold | `score: number` |
| `enroll_complete` | Enrollment scan succeeded | `template_hash`, `quality_score`, `finger_used` |
| `verify_complete` | Verification matched above threshold | `template_hash` (stored hash), `score` |
| `verify_no_match` | No enrolled template above threshold | — |
| `error` | Scanner hardware or SDK error | `message: string` |

### Agent state machine

```
disconnected → connecting → idle → waiting → scanning → processing
                               ↑                              │
                               └──── success / no_match / ───┘
                                     low_quality / error
```

---

## 11. Local template database

`templates.db` is a SQLite database created automatically in the `agent/` directory on first run.

### Schema

```sql
CREATE TABLE templates (
  hash        TEXT PRIMARY KEY,   -- SHA256 hex of the template binary
  template    BLOB NOT NULL,      -- Raw template binary from the SDK
  reg_number  TEXT NOT NULL,      -- Student registration number
  finger      TEXT NOT NULL DEFAULT 'right_index',
  enrolled_at INTEGER DEFAULT (strftime('%s','now'))
);
```

### Backup policy

**Back up `templates.db` daily.** It is the only copy of the raw template binaries. If it is lost:
- Students still appear as `biometric_enrolled = true` in Django
- But the agent cannot match them → they must re-enroll
- Re-enrollment writes a new hash to both `templates.db` and Django

Recommended: daily `rsync agent/templates.db /backups/`

### Multi-workstation deployments

Each workstation has its own `templates.db`. A student enrolled on workstation A can only be verified on workstation A unless you sync the database.

| Strategy | When to use |
|---|---|
| **Designated enroll terminals** | Small deployment — only 1–2 enrollment workstations |
| **rsync on cron** | Medium deployment — sync `templates.db` every hour to all terminals |
| **Shared network SQLite** | Only if all workstations are on a fast LAN and never offline |
| **Central matching server** (future) | Large deployment — store encrypted binaries in Django, do server-side 1:N matching |

---

## 12. Security model

| Concern | Mitigation |
|---|---|
| Raw biometric data leaves the machine | Never. Template binaries stay in `templates.db` only. Only SHA256 hashes (non-reversible) go anywhere. |
| Network exposure of the agent | WebSocket server binds to `127.0.0.1` only — unreachable from other hosts on the network. |
| Unauthorised browser connects | Any localhost process can currently connect. Add a shared secret (`Authorization` header check) in `ws.on('connection')` for higher-security deployments. |
| `templates.db` file access | Protect with OS permissions: `chmod 600 templates.db`. Only the agent process user should have access. |
| Workstation compromise | Delete the affected rows from `templates.db` and re-enroll affected students. Their Django hash records remain valid until re-enrollment issues a new hash. |
| Hash collision | SHA256 collisions are computationally infeasible. Two different fingerprint templates will not produce the same hash. |

---

## 13. Running as a background service

### Linux — systemd

Create `/etc/systemd/system/fingerprint-agent.service`:

```ini
[Unit]
Description=DisciplineTrack Fingerprint Agent
After=network.target

[Service]
Type=simple
User=disciplinetrack
WorkingDirectory=/opt/disciplinetrack/agent
ExecStart=/usr/bin/node /opt/disciplinetrack/agent/index.js
Restart=always
RestartSec=5
Environment=SDK_TYPE=secugen
Environment=MATCH_THRESHOLD=0.6

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable fingerprint-agent
sudo systemctl start fingerprint-agent
sudo journalctl -u fingerprint-agent -f   # stream logs
```

### Windows — NSSM

```powershell
# Download NSSM from nssm.cc, then:
nssm install DisciplineTrackAgent "C:\Program Files\nodejs\node.exe"
nssm set DisciplineTrackAgent AppParameters "C:\disciplinetrack\agent\index.js"
nssm set DisciplineTrackAgent AppDirectory "C:\disciplinetrack\agent"
nssm set DisciplineTrackAgent AppEnvironmentExtra "SDK_TYPE=secugen"
nssm start DisciplineTrackAgent
```

### macOS — launchd

Create `~/Library/LaunchAgents/com.disciplinetrack.agent.plist`:

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
    <string>/Users/you/disciplinetrack/agent/index.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SDK_TYPE</key><string>secugen</string>
  </dict>
  <key>RunAtLoad</key>  <true/>
  <key>KeepAlive</key>  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.disciplinetrack.agent.plist
```

---

## 14. Troubleshooting

### Browser shows "Agent offline — running in demo mode"

The browser tried `ws://localhost:4444` and got connection refused.

1. Check if the agent is running: `lsof -i :4444` (Linux/Mac) or `netstat -ano | findstr 4444` (Windows)
2. Start the agent: `node index.js --mock` to confirm basic connectivity first
3. Check port match: `VITE_FINGERPRINT_AGENT_URL` in the UI's `.env.local` must match `AGENT_PORT`
4. Firewall: confirm port 4444 is not blocked on the loopback interface

### "Scanner disconnected" error on first scan

The agent started but the USB scanner is not responding.

1. Unplug and re-plug the scanner
2. Run the vendor's own test utility to confirm the driver is working
3. **Linux — USB permissions:** `sudo usermod -aG plugdev $USER` then re-login
4. **Linux — udev rules for SecuGen:**
   ```bash
   echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="1162", MODE="0666"' \
     | sudo tee /etc/udev/rules.d/99-secugen.rules
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

### Verification always returns "no match found"

1. **Lower the threshold:** `MATCH_THRESHOLD=0.4 node index.js`
2. **Verify enrollment happened on this machine:**
   ```bash
   sqlite3 templates.db "SELECT reg_number, finger, enrolled_at FROM templates;"
   ```
3. **Re-enroll with better quality:** if the enrollment scan had `quality_score < 0.5`, matching will be unreliable. Re-enroll with a clean, firm finger placement.
4. **Wrong workstation:** templates are local. If enrolled on workstation A, verification must happen on A or the DB must be synced.

### FFI load error: "module not found" or "symbol lookup error"

The vendor shared library is missing or incompatible.

1. Confirm `.dll` / `.so` is in the `agent/` directory with the exact filename the code expects
2. **Linux:** `ldd /path/to/libsgfplib.so` — check all dependencies are satisfied
3. **Windows:** use [Dependency Walker](https://dependencywalker.com/) to find missing DLL dependencies
4. Confirm `node-ffi-napi` compiled for your Node.js version: `npm rebuild node-ffi-napi`
5. Confirm Node.js architecture (x64 vs ARM) matches the SDK binary

### High CPU during verification (large student population)

1:N matching scans every enrolled template. At 10,000+ students this can take several seconds.

- **Add in-memory cache** in `index.js`: load all templates into a `Map` at startup, update on new enrollments
- **Pre-filter by department** if the verification context is known
- **Move to server-side matching** for very large deployments: store encrypted template binaries in Django and run matching there using a fingerprint library

---

## 15. Extending to a new scanner model

Add a new scanner object in `agent/index.js` with these four methods:

```javascript
const MyScanner = {
  name: "My Scanner Model XYZ",

  open() {
    // Load shared library via node-ffi-napi, initialise the device.
    // Throw an Error if the device is not detected — the agent will
    // fall back to MockScanner automatically.
  },

  close() {
    // Release the device handle, unload the library.
    // Called on SIGINT / process exit.
  },

  async capture(finger) {
    // finger: string ("right_index", "right_thumb", etc.)
    // May be ignored if the device doesn't support finger selection.
    //
    // Returns: { template: Buffer, quality: number (0.0–1.0) }
    // Throws on hardware error or scan timeout.
  },

  match(liveTemplate, storedTemplate) {
    // liveTemplate:   Buffer — from a fresh capture()
    // storedTemplate: Buffer — from templates.db
    //
    // Returns: number (0.0–1.0) — similarity score.
    // Normalise your vendor's raw score to this range.
  },
};
```

Then register it in `buildScanner()`:

```javascript
function buildScanner() {
  const type = (process.env.SDK_TYPE ?? "mock").toLowerCase();
  switch (type) {
    case "secugen":   return SecuGenScanner;
    case "mantra":    return MantraScanner;
    case "myscanner": return MyScanner;    // ← add here
    default:          return MockScanner;
  }
}
```

Test with:

```bash
SDK_TYPE=myscanner node index.js
```

---

*Part of the DisciplineTrack project — see the [main README](../README.md) for full system documentation.*
