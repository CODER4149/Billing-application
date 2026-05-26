# Borewell ERP — Documentation

Technical documentation for the monorepo: shared UI, desktop shell, and mobile shell.

| Document | Description |
|----------|-------------|
| [UI (Web)](./ui.md) | Shared React app — routes, modules, API layer, state |
| [Desktop](./desktop.md) | Electron app — startup, IPC, database, build |
| [Mobile](./mobile.md) | Capacitor app — sync, Android/iOS workflow |

## Monorepo overview

One React UI (`packages/web`) runs inside two native shells:

```
packages/web          ← shared UI (React + Vite)
       │
       ├── apps/desktop   ← Electron + better-sqlite3 + IPC
       └── apps/mobile    ← Capacitor + SQLite plugin (planned bridge)
```

Shared packages used by all layers:

| Package | Role |
|---------|------|
| `@borewell/web` | React UI, pages, components |
| `@borewell/core` | GST math, validation, business rules |
| `@borewell/database` | Schema, migrations, bootstrap, seed |
| `@borewell/config` | Shared TypeScript configs |

## End-to-end architecture

```mermaid
flowchart TB
  subgraph UI["packages/web"]
    Pages[Feature Pages]
    API[api.ts]
    Store[Zustand Store]
    Pages --> API
    Pages --> Store
  end

  subgraph Desktop["apps/desktop"]
    Preload[Preload Bridge]
    IPC[IPC Handlers]
    DB1[(SQLite via better-sqlite3)]
    Preload --> IPC --> DB1
  end

  subgraph Mobile["apps/mobile"]
    WebView[Capacitor WebView]
    Native[Native Plugins - planned]
    DB2[(SQLite via Capacitor)]
    WebView --> Native --> DB2
  end

  API -->|window.api| Preload
  API -->|mock fallback| Mock[mockApi.ts]

  Desktop --> UI
  Mobile --> UI
```

## Runtime modes

```mermaid
flowchart LR
  A[User opens app] --> B{Platform?}

  B -->|Browser / pnpm dev:web| C[HTTP localhost:5173]
  B -->|pnpm dev:desktop| D[Electron + Vite dev server]
  B -->|Desktop installer| E[Electron + file:// bundle]
  B -->|Mobile app| F[Capacitor WebView]

  C --> G{window.api exists?}
  D --> H[window.api via preload]
  E --> H
  F --> G

  G -->|No| I[mockApi - in-memory demo data]
  G -->|Yes| J[Real SQLite backend]
  H --> J
```

## Common user flows

### Login

```mermaid
sequenceDiagram
  participant U as User
  participant LP as LoginPage
  participant API as api.auth.login
  participant BE as Backend / Mock

  U->>LP: Enter credentials
  LP->>API: login(username, password)
  API->>BE: Validate user
  BE-->>API: user + permissions
  API-->>LP: success
  LP->>LP: authStore.login(user)
  LP->>U: Redirect to Dashboard
```

### Invoice lifecycle

```mermaid
flowchart LR
  A[Create draft] --> B[Add line items + GST]
  B --> C[Save invoice]
  C --> D{Status}
  D -->|sent| E[Track payments]
  D -->|paid| F[Close]
  E --> G[Partial / full payment]
  G --> F
```

## Quick commands

| Goal | Command |
|------|---------|
| Web UI only (mock data) | `pnpm dev:web` |
| Desktop dev (real DB) | `pnpm dev:desktop` |
| Desktop installer | `pnpm build:desktop` |
| Mobile sync | `pnpm --filter @borewell/mobile build` |
| Typecheck all | `pnpm typecheck` |

Default login: **admin / admin123**

## Data locations

| Platform | Database | Logs |
|----------|----------|------|
| Desktop (Windows) | `%APPDATA%/@borewell/desktop/BorewellERP/database/borewell.db` | `<exe-dir>/app_logs/` |
| Web dev | None (mock) | Browser console |
| Mobile | Device-local SQLite (when bridge is wired) | Platform logs |
