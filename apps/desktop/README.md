# @borewell/desktop

Electron shell for Borewell ERP (Windows, macOS, Linux).

## Quick start

```bash
pnpm dev:desktop      # Dev: Vite + Electron + real SQLite
pnpm build:desktop    # Production installer → release/
```

Default login: **admin / admin123**

## What it does

- Loads the shared React UI from `@borewell/web`
- Runs SQLite via `better-sqlite3`
- Exposes `window.api` through IPC preload bridge

## Full documentation

See **[docs/desktop.md](../../docs/desktop.md)** for startup flow, IPC channels, data paths, build pipeline, and troubleshooting.
