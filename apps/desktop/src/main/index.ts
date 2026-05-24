import { app, BrowserWindow, shell, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureAppDirs, getAppPaths, getWebUrl, isDev } from "./paths.js";
import { BetterSqliteAdapter } from "./database/adapter.js";
import { initDatabase, registerIpcHandlers } from "./ipc/handlers.js";
import {
  attachWindowLogging,
  initAppLogger,
  installMainProcessLogging,
  tryGetLogger,
} from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getWindowIcon() {
  const iconPath = path.join(__dirname, "..", "..", "assets", "icon.png");
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return undefined;
}

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  const paths = getAppPaths();
  ensureAppDirs(paths);

  const dbAdapter = new BetterSqliteAdapter(paths.database);
  await initDatabase(dbAdapter);
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: getWindowIcon(),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  attachWindowLogging(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    tryGetLogger()?.info("main", "Main window ready", { url: getWebUrl() });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(getWebUrl());

  if (isDev()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const paths = getAppPaths();
  ensureAppDirs(paths);
  initAppLogger(paths.logs);
  installMainProcessLogging();

  try {
    await createWindow();
  } catch (error) {
    tryGetLogger()?.error("main", "Failed to create application window", error, "apps/desktop/src/main/index.ts:72");
    throw error;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    tryGetLogger()?.info("main", "All windows closed — quitting");
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      tryGetLogger()?.error("main", "Failed to recreate window on activate", error);
    });
  }
});

app.on("before-quit", () => {
  tryGetLogger()?.info("main", "Application shutting down");
});
