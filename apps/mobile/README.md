# @borewell/mobile

Capacitor shell for Borewell ERP (Android, iOS).

## Quick start

```bash
pnpm --filter @borewell/web build
pnpm --filter @borewell/mobile sync
pnpm --filter @borewell/mobile open:android
```

## What it does

- Wraps the shared React UI (`packages/web/dist`) in a native WebView
- Configured for `@capacitor-community/sqlite` (native bridge planned)

## Full documentation

See **[docs/mobile.md](../../docs/mobile.md)** for build/deploy flow, Capacitor config, and troubleshooting.
