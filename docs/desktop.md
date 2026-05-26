# Desktop Documentation (`apps/desktop`)

Electron shell for Windows, macOS, and Linux. Hosts the shared React UI and provides SQLite access through a secure IPC bridge.

## Purpose

- Run the ERP fully offline with a local SQLite database
- Expose database and file operations to the UI via `window.api`
- Package as a single installer (NSIS on Windows, DMG on macOS, AppImage/deb on Linux)

## Folder structure

```
apps/desktop/
├── assets/                 # App icons (png, ico)
├── scripts/make-icon.mjs   # Generates .ico for Windows builds
├── src/
│   ├── main/
│   │   ├── index.ts        # App entry, window creation
│   │   ├── paths.ts        # Data dirs, web bundle path
│   │   ├── logger.ts       # File logging (7-day retention)
│   │   ├── database/
│   │   │   └── adapter.ts  # better-sqlite3 adapter
│   │   └── ipc/
│   │       ├── handlers.ts # All IPC handlers + DB init
│   │       └── invoiceFields.ts
│   └── preload/
│       └── index.ts        # contextBridge → window.api
├── dist/                   # Compiled main + preload (tsc output)
└── release/                # electron-builder output
```

## Startup flow

```mermaid
flowchart TD
  A[app.whenReady] --> B[initAppLogger]
  B --> C[ensureAppDirs]
  C --> D[createWindow]
  D --> E[BetterSqliteAdapter]
  E --> F[bootstrapDatabase]
  F --> G[migrateUp + seed + sample data]
  G --> H[registerIpcHandlers]
  H --> I[new BrowserWindow]
  I --> J{isDev?}
  J -->|Yes| K[loadURL localhost:5173]
  J -->|No| L[loadFile resources/web/index.html]
  K --> M[ready-to-show → show window]
  L --> M
```

## Production vs development

| Aspect | Development | Production |
|--------|-------------|------------|
| UI source | Vite dev server `:5173` | Bundled `resources/web/` |
| Load method | `loadURL()` | `loadFile()` |
| Router (UI) | BrowserRouter | HashRouter |
| DevTools | Open automatically | Closed |
| `app.isPackaged` | false | true |

## IPC architecture

```mermaid
flowchart LR
  subgraph Renderer["Renderer (React)"]
    UI[Pages] --> WA[window.api]
  end

  subgraph Preload["Preload (isolated)"]
    WA --> CB[contextBridge]
    CB --> IPC_R[ipcRenderer.invoke]
  end

  subgraph Main["Main Process"]
    IPC_M[ipcMain.handle] --> H[handlers.ts]
    H --> DB[(better-sqlite3)]
    H --> FS[File system backups/logs]
  end

  IPC_R --> IPC_M
```

Security settings:
- `contextIsolation: true`
- `nodeIntegration: false`
- Preload is the only bridge between UI and Node

## IPC channels

| Channel | Purpose |
|---------|---------|
| `auth:login` | User authentication |
| `dashboard:*` | KPIs, charts, refresh |
| `clients:*` | Client CRUD |
| `invoices:*` | Invoice CRUD + status |
| `payments:*` | Payment CRUD |
| `borewell:*` | Borewell job CRUD |
| `vehicles:*` | Vehicle CRUD |
| `expenses:*` | Expense CRUD |
| `gst:summary` | GST reports |
| `settings:*` | App settings |
| `backup:*` | Create, list, restore |
| `audit:getLogs` | Audit trail |
| `users:*` / `roles:list` | User management |
| `logs:*` / `app:writeLog` | Application logging |
| `app:getInfo` | Version, paths, platform |

## Auth flow

```mermaid
sequenceDiagram
  participant UI as LoginPage
  participant P as Preload
  participant M as handlers.ts
  participant DB as SQLite

  UI->>P: api.auth.login(user, pass)
  P->>M: ipc auth:login
  M->>DB: SELECT user + role permissions
  M->>M: bcrypt verify password
  M-->>UI: { success, user, permissions }
```

## Database bootstrap

On every launch (first run creates DB):

```mermaid
flowchart LR
  A[bootstrapDatabase] --> B[migrateUp]
  B --> C[seedDatabase]
  C --> D[seedSampleData]
  D --> E[warmDashboardCache]
  E --> F[activity_logs entry]
```

Uses `@borewell/database` — same migrations as CLI (`pnpm db:migrate`).

## Data paths (Windows)

| Path | Location |
|------|----------|
| User data root | `%APPDATA%/@borewell/desktop/BorewellERP/` |
| Database | `.../BorewellERP/database/borewell.db` |
| Backups | `.../BorewellERP/backups/` |
| Exports | `.../BorewellERP/exports/` |
| Invoice PDFs | `.../BorewellERP/invoices/pdf/` |
| App logs | `<install-dir>/app_logs/application-YYYY-MM-DD.txt` |

Logs are written next to the executable (not in AppData). Retention: **7 days**.

## Build flow

```mermaid
flowchart TD
  A[pnpm build:desktop] --> B[make-icon]
  B --> C[build @borewell/web]
  C --> D[tsc compile main + preload]
  D --> E[electron-builder]
  E --> F[Package dist/ into asar]
  E --> G[Copy web/dist → resources/web]
  F --> H[release/ installer]
  G --> H
```

Output:
- Windows: `apps/desktop/release/Borewell ERP Setup 1.0.0.exe`
- Unpacked: `apps/desktop/release/win-unpacked/Borewell ERP.exe`

## Development

```bash
pnpm dev:desktop
```

This runs:
1. Build `@borewell/database` and `@borewell/core`
2. Start Vite dev server (`@borewell/web`)
3. Wait for `:5173`, compile TypeScript, launch Electron

Default login: **admin / admin123**

## Logging & troubleshooting

```mermaid
flowchart TD
  A[Issue in packaged app] --> B[Open app_logs/ next to exe]
  B --> C{Error type?}
  C -->|Page failed to load| D[Check resources/web exists]
  C -->|Renderer ERROR| E[JS error in UI — check stack]
  C -->|Database bootstrap failed| F[Check userData permissions]
  C -->|IPC error| G[Check handlers.ts channel name]
```

From Settings page you can also open today's log file via `api.logs.openToday()`.

## Native dependencies

- **better-sqlite3** — rebuilt on install via `electron-builder install-app-deps`
- **bcryptjs** — password hashing

## Adding a new IPC endpoint

1. Add handler in `src/main/ipc/handlers.ts`
2. Expose in `src/preload/index.ts`
3. Extend `ApiClient` in `packages/web/src/services/api.ts`
4. Add mock implementation in `mockApi.ts`
5. Use from UI via `api.yourDomain.method()`
