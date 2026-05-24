# Borewell ERP

Offline-first **Borewell + Billing ERP** system. Runs entirely locally with SQLite — no server or internet required.

## Features

- **Clients, Invoices, Payments** with item-level payment tracking
- **GST calculations** (CGST, SGST, IGST) and reports
- **Borewell job tracking**, vehicles, expenses
- **Executive dashboard** with KPIs and analytics charts
- **Audit logging**, backup/restore, role-based access
- **Desktop** (Electron) + **Mobile** (Capacitor) from one monorepo

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, Vite, TailwindCSS 4, Framer Motion, Recharts |
| Desktop | Electron + better-sqlite3 |
| Mobile | Capacitor + SQLite plugin |
| Database | SQLite with Alembic-style migrations |
| ORM | Drizzle ORM |
| State | Zustand |

## Project Structure

```
Billing-application/
├── apps/
│   ├── desktop/     # Electron shell (Windows/Mac/Linux)
│   └── mobile/      # Capacitor shell (Android/iOS)
├── packages/
│   ├── web/         # Shared React UI
│   ├── database/    # Schema, migrations, bootstrap
│   ├── core/        # Business logic, GST, validation
│   └── config/      # Shared TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
pnpm install
```

### Development (Desktop)

```bash
pnpm dev:desktop
```

This starts the Vite dev server and Electron app. Default login: **admin / admin123**

### Development (Web only)

```bash
pnpm dev:web
```

Opens at http://localhost:5173 with mock API (no database).

### Build Desktop Installer

```bash
pnpm build:desktop
```

Output in `apps/desktop/release/`.

### Mobile

```bash
pnpm --filter @borewell/web build
pnpm --filter @borewell/mobile sync
pnpm --filter @borewell/mobile open:android
```

## First Launch

On first open, the app automatically:

1. Creates application data folders
2. Initializes SQLite database
3. Runs all migrations
4. Seeds admin user, roles, permissions, settings
5. Loads sample invoice data

## Database

- **20 tables**: users, roles, clients, invoices, payments, borewell_jobs, vehicles, expenses, gst_records, audit_logs, and more
- **Migrations**: `packages/database/src/migrations/sql/`
- **Data location** (Windows dev/desktop): `%APPDATA%/@borewell/desktop/BorewellERP/`
  - Database file: `%APPDATA%/@borewell/desktop/BorewellERP/database/borewell.db`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:desktop` | Run Electron + web dev |
| `pnpm dev:web` | Run web UI only |
| `pnpm build` | Build all packages |
| `pnpm build:desktop` | Build installer |
| `pnpm db:migrate` | Run migrations CLI |
| `pnpm typecheck` | TypeScript check |

## License

Private — All rights reserved.
