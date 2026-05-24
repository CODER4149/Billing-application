import { app, BrowserWindow, shell, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureAppDirs, getAppPaths, getWebUrl, isDev } from "./paths.js";
import { BetterSqliteAdapter } from "./database/adapter.js";
import { initDatabase, registerIpcHandlers } from "./ipc/handlers.js";

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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
