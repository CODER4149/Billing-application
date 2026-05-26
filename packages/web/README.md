# @borewell/web

Shared React UI for Borewell ERP — used by desktop and mobile shells.

## Quick start

```bash
pnpm dev:web          # Browser dev server with mock API
pnpm build            # Production bundle → dist/
```

## What it includes

- 15+ feature modules (invoices, clients, borewell jobs, GST, etc.)
- Unified `api` layer (Electron IPC or mock fallback)
- Zustand state, TailwindCSS 4, Recharts dashboards

## Full documentation

See **[docs/ui.md](../../docs/ui.md)** for routes, folder structure, API flow, and CRUD patterns.
