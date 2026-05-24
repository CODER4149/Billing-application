import fs from "node:fs";
import path from "node:path";
import { ipcMain, shell, type BrowserWindow } from "electron";
import { getAppPaths } from "./paths.js";

export const LOG_RETENTION_DAYS = 7;
const LOG_FILE_PREFIX = "application-";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogWriteOptions {
  level: LogLevel;
  source: string;
  message: string;
  location?: string;
  details?: unknown;
  error?: unknown;
}

let loggerInstance: AppLogger | null = null;

function formatDateForFile(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function serializeDetails(details: unknown): string {
  if (details === undefined || details === null) return "";
  if (details instanceof Error) return details.stack ?? details.message;
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function levelFromConsoleMethod(method: string): LogLevel {
  switch (method) {
    case "error":
      return "ERROR";
    case "warn":
      return "WARN";
    case "debug":
      return "DEBUG";
    default:
      return "INFO";
  }
}

export class AppLogger {
  private readonly logDir: string;
  private currentDate = "";
  private currentFilePath = "";

  constructor(logDir: string) {
    this.logDir = logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.rotateIfNeeded();
    this.cleanupOldLogs();
  }

  getTodayLogPath(): string {
    this.rotateIfNeeded();
    return this.currentFilePath;
  }

  getLogDir(): string {
    return this.logDir;
  }

  info(source: string, message: string, details?: unknown, location?: string): void {
    this.write({ level: "INFO", source, message, details, location });
  }

  warn(source: string, message: string, details?: unknown, location?: string): void {
    this.write({ level: "WARN", source, message, details, location });
  }

  error(source: string, message: string, error?: unknown, location?: string): void {
    this.write({ level: "ERROR", source, message, error, location });
  }

  write(options: LogWriteOptions): void {
    this.writeToFileOnly(options);
    const consoleLine = `[${options.level}] [${options.source}] ${options.message}`;
    if (options.level === "ERROR") console.error(consoleLine, options.error ?? options.details ?? "");
    else if (options.level === "WARN") console.warn(consoleLine, options.details ?? "");
    else console.log(consoleLine, options.details ?? "");
  }

  writeToFileOnly(options: LogWriteOptions): void {
    this.rotateIfNeeded();
    const block = this.formatEntry(options);
    fs.appendFileSync(this.currentFilePath, block, "utf-8");
  }

  cleanupOldLogs(): void {
    const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const file of fs.readdirSync(this.logDir)) {
      if (!file.startsWith(LOG_FILE_PREFIX) || !file.endsWith(".log")) continue;

      const fullPath = path.join(this.logDir, file);
      const dateMatch = file.match(/application-(\d{4}-\d{2}-\d{2})\.log/);
      const fileTime = dateMatch
        ? new Date(`${dateMatch[1]}T23:59:59.999Z`).getTime()
        : fs.statSync(fullPath).mtimeMs;

      if (fileTime < cutoff) {
        fs.unlinkSync(fullPath);
        removed += 1;
      }
    }

    if (removed > 0) {
      this.write({
        level: "INFO",
        source: "logger",
        message: `Log retention cleanup removed ${removed} file(s) older than ${LOG_RETENTION_DAYS} days`,
      });
    }
  }

  private rotateIfNeeded(): void {
    const today = formatDateForFile(new Date());
    if (today === this.currentDate && this.currentFilePath) return;

    this.currentDate = today;
    this.currentFilePath = path.join(this.logDir, `${LOG_FILE_PREFIX}${today}.log`);

    if (!fs.existsSync(this.currentFilePath)) {
      const header = [
        "# Borewell ERP Application Log",
        `# File: ${this.currentFilePath}`,
        `# Retention: last ${LOG_RETENTION_DAYS} days (older files auto-deleted on startup)`,
        "# Search for >>> ERROR <<< to jump to failures",
        "# Location lines use file:line:column — clickable in VS Code / Cursor",
        "",
      ].join("\n");
      fs.writeFileSync(this.currentFilePath, header, "utf-8");
    }
  }

  private formatEntry(options: LogWriteOptions): string {
    const ts = formatTimestamp(new Date());
    const details = options.details ?? options.error;
    const detailsText = serializeDetails(details);
    const stack =
      options.error instanceof Error && options.error.stack && options.error !== details
        ? options.error.stack
        : details instanceof Error
          ? details.stack
          : undefined;

    if (options.level === "ERROR") {
      const lines = [
        "================================================================================",
        `>>> ERROR <<< ${ts}`,
        `Source: ${options.source}`,
      ];
      if (options.location) lines.push(`Location: ${options.location}`);
      lines.push(`Message: ${options.message}`);
      if (detailsText) lines.push(`Details:\n${detailsText}`);
      if (stack && stack !== detailsText) lines.push(`Stack:\n${stack}`);
      lines.push("================================================================================", "");
      return lines.join("\n");
    }

    const parts = [`${ts} | ${options.level.padEnd(5)} | ${options.source} | ${options.message}`];
    if (options.location) parts.push(`  Location: ${options.location}`);
    if (detailsText) parts.push(`  Details: ${detailsText.replace(/\n/g, "\n  ")}`);
    return `${parts.join("\n")}\n`;
  }
}

export function initAppLogger(logDir: string): AppLogger {
  loggerInstance = new AppLogger(logDir);
  loggerInstance.info("main", "Application logger initialized", {
    logDir,
    retentionDays: LOG_RETENTION_DAYS,
    todayFile: loggerInstance.getTodayLogPath(),
  });
  return loggerInstance;
}

export function getLogger(): AppLogger {
  if (!loggerInstance) {
    throw new Error("Application logger not initialized");
  }
  return loggerInstance;
}

export function tryGetLogger(): AppLogger | null {
  return loggerInstance;
}

export function installMainProcessLogging(): void {
  const logger = getLogger();

  const originals = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  process.on("uncaughtException", (error) => {
    logger.error("main", "Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("main", "Unhandled promise rejection", reason);
  });

  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    console[method] = (...args: unknown[]) => {
      originals[method](...args);
      const message = args
        .map((arg) => (typeof arg === "string" ? arg : serializeDetails(arg)))
        .join(" ");
      logger.writeToFileOnly({
        level: levelFromConsoleMethod(method),
        source: "main/console",
        message,
      });
    };
  }
}

export function attachWindowLogging(window: BrowserWindow): void {
  const logger = getLogger();
  const wc = window.webContents;

  wc.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logger.error("renderer", "Page failed to load", {
      errorCode,
      errorDescription,
      url: validatedURL,
    }, "apps/desktop/src/main/index.ts:54");
  });

  wc.on("render-process-gone", (_event, details) => {
    logger.error("renderer", "Render process gone", details);
  });

  wc.on("unresponsive", () => {
    logger.warn("renderer", "Window became unresponsive");
  });

  wc.on("responsive", () => {
    logger.info("renderer", "Window responsive again");
  });

  wc.on("console-message", (_event, level, message, line, sourceId) => {
    const logLevel: LogLevel =
      level === 3 ? "ERROR" : level === 2 ? "WARN" : level === 1 ? "DEBUG" : "INFO";
    const location = sourceId && line ? `${sourceId}:${line}:0` : undefined;
    logger.write({
      level: logLevel,
      source: "renderer/console",
      message,
      location,
    });
  });
}

export function registerLogHandlers(): void {
  ipcMain.handle("logs:getInfo", () => {
    const logger = getLogger();
    return {
      folder: getAppPaths().logs,
      todayFile: logger.getTodayLogPath(),
      retentionDays: LOG_RETENTION_DAYS,
    };
  });

  ipcMain.handle("logs:openFolder", async () => {
    const folder = getAppPaths().logs;
    await shell.openPath(folder);
    getLogger().info("main", "Opened logs folder from UI", { folder });
    return { success: true, path: folder };
  });

  ipcMain.handle("logs:openToday", async () => {
    const file = getLogger().getTodayLogPath();
    await shell.openPath(file);
    getLogger().info("main", "Opened today's log file from UI", { file });
    return { success: true, path: file };
  });

  ipcMain.handle(
    "app:writeLog",
    (_event, level: LogLevel, source: string, message: string, details?: unknown, location?: string) => {
      getLogger().write({
        level,
        source: source || "renderer",
        message,
        details,
        location,
      });
      return { success: true };
    }
  );
}
