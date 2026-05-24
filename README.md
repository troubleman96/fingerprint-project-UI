# DisciplineTrack UI

DisciplineTrack UI is a TanStack Start + React frontend for a student disciplinary management system. It presents a role-aware dashboard for tracking students, disciplinary cases, biometric enrollment, reports, audit history, user administration, and system settings.

The current codebase is a demo-style application driven by local mock data in `src/data/mock.ts`. There is no real backend yet, so login, records, analytics, and biometric flows are simulated in the browser to demonstrate the product experience and screen flow.

## What The App Does

The app is designed for institutions that need to:

- register and manage student profiles
- record disciplinary incidents step by step
- track case severity, status, and assigned officers
- simulate biometric identification and enrollment flows
- review audit activity and operational analytics
- manage role-based access to sensitive screens

## Main User Flow

1. The user lands on `/login`.
2. They sign in using one of the seeded demo accounts from `src/data/mock.ts`.
3. Auth state is stored in a persisted Zustand store, so refreshes keep the user signed in.
4. After login, the app opens the protected `/app/*` shell.
5. The shell renders the sidebar, topbar, page title, and nested routes.
6. Each route reads mock data directly and renders tables, charts, forms, or detail panels.
7. Destructive or server-backed actions are currently simulated with local state and toast messages.

## Demo Accounts

These users exist in the seeded mock dataset:

- `admin@dit.ac.tz`
- `officer@dit.ac.tz`
- `staff@dit.ac.tz`

The current login function only checks whether the email exists in the mock user list. The password is not validated against a real authentication service.

## Feature Areas

### Dashboard

- summary cards for core discipline metrics
- recent cases table
- quick actions
- charts for case trends

### Students

- student listing with search and filters
- student detail page
- register/edit flows
- biometric enrollment status
- student-linked case history

### Cases

- case listing with filters
- multi-step case creation flow
- case detail view
- mock status progression
- placeholders for notes and evidence

### Biometrics

- fingerprint verification simulator
- fingerprint enrollment simulator
- student lookup before enrollment

### Reports

- charts based on mock case data
- repeat-offender table
- export actions currently mocked via toast notifications

### Audit

- searchable append-only activity log view

### User Administration

- restricted to `ADMIN`
- staff account listing
- user creation flow

### Settings

- account settings
- theme settings
- notification preferences
- admin-only system settings tab

## Tech Stack

- React 19
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS v4
- Radix UI primitives
- Recharts
- Sonner toasts

## Project Structure

```text
src/
  components/
    layout/        app chrome such as sidebar and topbar
    shared/        reusable product widgets
    ui/            low-level UI primitives
  data/
    mock.ts        seeded demo data for the whole app
  routes/
    login.tsx      public login page
    _app.tsx       protected app shell
    _app.app.*     feature pages under /app/*
  store/
    authStore.ts   persisted auth session
    themeStore.ts  persisted light/dark theme
  start.ts         TanStack Start bootstrap
  server.ts        server-entry error normalization wrapper
```

## Installation

### Prerequisites

- Node.js 20+ recommended
- `npm` available locally

### Install Dependencies

```bash
npm install
```

If you prefer Bun, the repo also includes `bun.lock`, but `package-lock.json` is not yet committed as a tracked file in the current worktree.

## Run The App

```bash
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run format
```

## How Data Works Today

- all business data lives in `src/data/mock.ts`
- pages import arrays directly from that file
- form submissions usually show a toast and navigate away
- no network requests or API mutations are wired yet
- auth and theme are persisted in browser storage using Zustand middleware

## How To Safely Modify The App

1. Start by reading `docs/ARCHITECTURE.md`.
2. Check whether the screen you want to change is route-local or shared.
3. If the change affects tables, cards, badges, or page chrome, inspect `src/components/shared` or `src/components/layout`.
4. If the change affects product data, update `src/types/index.ts` and `src/data/mock.ts` together.
5. If the change introduces a real backend, replace direct imports from `mock.ts` with a query or API layer instead of patching each page ad hoc.

## Current Limitations

- no real backend or persistence layer
- no real biometric device integration
- no server-side authorization enforcement
- no database writes
- several actions are UI placeholders
- root redirect sends `/` to `/app/dashboard`, and the protected shell then redirects unauthenticated users to `/login`

## Extra Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)

