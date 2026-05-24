import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { AppPaths } from "@borewell/database";

export function getAppPaths(): AppPaths {
  const root = path.join(app.getPath("userData"), "BorewellERP");
  const paths: AppPaths = {
    root,
    database: path.join(root, "database", "borewell.db"),
    backups: path.join(root, "backups"),
    logs: path.join(root, "logs"),
    exports: path.join(root, "exports"),
    invoices: path.join(root, "invoices", "pdf"),
  };
  return paths;
}

export function ensureAppDirs(paths: AppPaths): void {
  const dirs = [paths.root, path.dirname(paths.database), paths.backups, paths.logs, paths.exports, paths.invoices];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function isDev(): boolean {
  return !app.isPackaged;
}

export function getWebUrl(): string {
  if (isDev()) {
    return "http://localhost:5173";
  }
  return `file://${path.join(process.resourcesPath, "web", "index.html")}`;
}
