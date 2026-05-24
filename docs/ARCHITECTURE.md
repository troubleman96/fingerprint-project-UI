# DisciplineTrack UI Architecture

This document explains how the frontend is structured, how the app behaves step by step, and where to make changes safely.

## Product Intent

DisciplineTrack UI models a disciplinary case management system for an academic institution. The app focuses on the lifecycle of:

1. identifying a student
2. recording an incident
3. assigning or reviewing the case
4. tracking the case status
5. auditing who did what
6. using biometric verification as part of student lookup and identity assurance

In the current repository, all of that behavior is represented as frontend state and demo data.

## Runtime Architecture

### 1. Boot

- `src/start.ts` creates the TanStack Start instance.
- A request middleware catches unexpected server-side errors and swaps them for a branded HTML error page.
- `src/server.ts` wraps TanStack Start's server entry and normalizes certain swallowed SSR failures into the same branded error response.

### 2. Router

- `src/router.tsx` creates the TanStack Router instance.
- `src/routeTree.gen.ts` is generated from the file-based route structure.
- `src/routes/__root.tsx` provides the root HTML shell, metadata, query-client context, and global error boundaries.

### 3. Session Gate

- `src/routes/_app.tsx` is the protected application shell.
- It waits for Zustand persistence hydration before deciding whether the user is authenticated.
- If there is no authenticated session after hydration, it redirects the browser to `/login`.

### 4. Feature Screens

Each route under `src/routes/_app.app.*` renders a screen inside the shell:

- dashboard
- students
- cases
- biometrics
- reports
- audit
- users
- settings

## Route Map

### Public

- `/login`: demo sign-in page with email/password and biometric login simulator
- `/`: redirects to `/app/dashboard`

### Protected Shell

- `/_app`: shared layout route that renders the sidebar, topbar, toasts, and nested pages

### Protected Feature Routes

- `/app/dashboard`
- `/app/students`
- `/app/students/new`
- `/app/students/$id`
- `/app/students/$id/edit`
- `/app/cases`
- `/app/cases/new`
- `/app/cases/$id`
- `/app/cases/$id/edit`
- `/app/biometric`
- `/app/biometric/enroll`
- `/app/reports`
- `/app/audit`
- `/app/users`
- `/app/users/new`
- `/app/settings`

## Data Model

All current data lives in `src/data/mock.ts`.

### Main exported datasets

- `departments`
- `users`
- `incidentTypes`
- `students`
- `cases`
- `auditLog`
- `dashboardStats`

### Shared types

Defined in `src/types/index.ts`:

- `Role`
- `CaseStatus`
- `CaseSeverity`
- `CaseOutcome`
- `User`
- `Student`
- `IncidentType`
- `DisciplinaryCase`
- `AuditEntry`

### Important implication

Because routes import arrays directly from `mock.ts`, the UI is not modeling request boundaries yet. That means:

- there is no fetch layer
- there is no cache invalidation strategy beyond React state
- mutations are mostly simulated
- route refresh does not persist edits unless a store is involved

If you add a real API later, the clean migration path is:

1. preserve the domain types
2. add query/mutation wrappers
3. move pages from direct `mock.ts` imports to data hooks
4. keep presentational components mostly unchanged

## State Management

### Auth Store

File: `src/store/authStore.ts`

- powered by Zustand with `persist`
- stores `user` and `isAuthenticated`
- `login(email)` looks up a user from mock data
- session is saved under `dt-auth`

This is frontend-only access control. It is useful for demos, but not secure by itself.

### Theme Store

File: `src/store/themeStore.ts`

- powered by Zustand with `persist`
- stores `light` or `dark`
- toggles the `dark` class on `<html>`
- state is saved under `dt-theme`

## Layout System

### Root Shell

File: `src/routes/__root.tsx`

Responsibilities:

- document shell
- metadata
- not-found view
- fatal route error UI
- React Query provider

### App Shell

File: `src/routes/_app.tsx`

Responsibilities:

- auth gate after persistence hydration
- theme class synchronization
- mobile sidebar sheet
- dynamic page title mapping
- global toast placement

### Sidebar

File: `src/components/layout/Sidebar.tsx`

Responsibilities:

- primary navigation
- system navigation
- role-based nav filtering
- current-user summary

### Topbar

File: `src/components/layout/Topbar.tsx`

Responsibilities:

- current page title
- theme toggle
- quick new-case shortcut
- logout action
- placeholder global search and notifications

## Shared UI Patterns

### `DataTable`

File: `src/components/shared/DataTable.tsx`

This is the main reusable table primitive in the app. It handles:

- client-side search
- optional sorting
- simple pagination
- row-click behavior
- empty state rendering

Many pages depend on it, so changes here will affect students, cases, reports, audit, and admin screens.

### Smaller shared widgets

Examples:

- `PageHeader`
- `StatCard`
- `StatusBadge`
- `SeverityBadge`
- `RoleBadge`
- `Avatar`
- `BiometricSimulator`
- `EmptyState`

## Feature Walkthroughs

### Login Flow

1. User opens `/login`.
2. They enter a seeded email or open the biometric dialog.
3. `useAuthStore().login()` checks for a matching mock user.
4. On success, the app stores session state locally and navigates to `/app/dashboard`.

### Student Management Flow

1. Open `/app/students`.
2. Filter or search the student list.
3. Open a student detail page.
4. Review registration info, biometrics, and case history.
5. Trigger actions like filing a new case or beginning biometric enrollment.

### Case Filing Flow

The new-case route is a multi-step wizard:

1. identify the student by registration number or biometric scan
2. enter incident type, severity, date, location, description, and assignee
3. attach evidence files
4. review the payload and submit

Today, submit only shows a toast and routes back to the case list.

### Biometric Flow

1. Open `/app/biometric`.
2. Choose enrollment or verification.
3. The simulator component mocks scanner behavior and success feedback.
4. Enrollment can be confirmed after a student is selected and a scan succeeds.

### User Management Flow

1. Open `/app/users`.
2. Route checks the logged-in role from the auth store.
3. Non-admin users see an access-restricted state.
4. Admin users see a staff table and shortcuts to add users.

## Where To Edit What

### Change labels, mock records, default scenarios

- `src/data/mock.ts`

### Change domain fields

- `src/types/index.ts`
- any route or shared component that renders the changed field

### Change protected layout behavior

- `src/routes/_app.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`

### Change table behavior across the app

- `src/components/shared/DataTable.tsx`

### Change route behavior for a single screen

- the matching file in `src/routes`

## Safe Change Strategy

When making changes, use this order:

1. identify whether the change is local, shared, or data-model-wide
2. update shared types first if the data shape changes
3. update mock data second if the UI still depends on it
4. update shared components before patching multiple screens
5. run a build after editing route or shared files

## Known Gaps

- no API integration
- no database
- no real biometric device SDK
- no server-validated auth or permissions
- some buttons are visual placeholders
- metadata in `__root.tsx` still contains template text and should be replaced before production

## Suggested Next Refactors

If this moves beyond demo stage, the highest-value improvements are:

1. replace `mock.ts` imports with a real service layer
2. enforce route protection with backend-issued identity
3. centralize constants such as route titles and role rules
4. replace placeholder actions with real mutations
5. add tests around auth gating, case workflows, and role restrictions

