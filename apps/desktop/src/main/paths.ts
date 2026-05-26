import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { AppPaths } from "@borewell/database";

const APP_LOGS_DIR_NAME = "app_logs";

/** Logs folder next to the installed/portable application executable. */
export function getAppLogsDir(): string {
  const logDir = app.isPackaged
    ? path.join(path.dirname(app.getPath("exe")), APP_LOGS_DIR_NAME)
    : path.join(app.getAppPath(), APP_LOGS_DIR_NAME);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

export function getAppPaths(): AppPaths {
  const root = path.join(app.getPath("userData"), "BorewellERP");
  const paths: AppPaths = {
    root,
    database: path.join(root, "database", "borewell.db"),
    backups: path.join(root, "backups"),
    logs: getAppLogsDir(),
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

export function getWebIndexPath(): string {
  return path.join(process.resourcesPath, "web", "index.html");
}

export function getWebUrl(): string {
  return "http://localhost:5173";
}
