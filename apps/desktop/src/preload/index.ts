import { contextBridge, ipcRenderer } from "electron";

const api = {
  app: {
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
  },
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke("auth:login", username, password),
  },
  dashboard: {
    getKpis: () => ipcRenderer.invoke("dashboard:getKpis"),
    refresh: () => ipcRenderer.invoke("dashboard:refresh"),
    revenueTrend: (period: string) => ipcRenderer.invoke("dashboard:revenueTrend", period),
    statusDistribution: () => ipcRenderer.invoke("dashboard:statusDistribution"),
    serviceSplit: () => ipcRenderer.invoke("dashboard:serviceSplit"),
    topClients: () => ipcRenderer.invoke("dashboard:topClients"),
    pendingAging: () => ipcRenderer.invoke("dashboard:pendingAging"),
  },
  clients: {
    list: () => ipcRenderer.invoke("clients:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("clients:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("clients:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("clients:delete", id, userId),
  },
  invoices: {
    list: () => ipcRenderer.invoke("invoices:list"),
    get: (id: string) => ipcRenderer.invoke("invoices:get", id),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("invoices:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("invoices:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("invoices:delete", id, userId),
    updateStatus: (id: string, status: string, userId?: string) =>
      ipcRenderer.invoke("invoices:updateStatus", id, status, userId),
  },
  payments: {
    list: () => ipcRenderer.invoke("payments:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("payments:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("payments:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("payments:delete", id, userId),
  },
  borewell: {
    list: () => ipcRenderer.invoke("borewell:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("borewell:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("borewell:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("borewell:delete", id, userId),
  },
  vehicles: {
    list: () => ipcRenderer.invoke("vehicles:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("vehicles:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("vehicles:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("vehicles:delete", id, userId),
  },
  expenses: {
    list: () => ipcRenderer.invoke("expenses:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("expenses:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("expenses:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("expenses:delete", id, userId),
  },
  gst: {
    summary: (year?: string) => ipcRenderer.invoke("gst:summary", year),
  },
  settings: {
    getAll: () => ipcRenderer.invoke("settings:getAll"),
    update: (settings: Record<string, string>, userId?: string) =>
      ipcRenderer.invoke("settings:update", settings, userId),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    list: () => ipcRenderer.invoke("backup:list"),
    restore: (path: string) => ipcRenderer.invoke("backup:restore", path),
  },
  audit: {
    getLogs: (filters: Record<string, unknown>) => ipcRenderer.invoke("audit:getLogs", filters),
  },
  users: {
    list: () => ipcRenderer.invoke("users:list"),
    create: (data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("users:create", data, userId),
    update: (id: string, data: Record<string, unknown>, userId?: string) =>
      ipcRenderer.invoke("users:update", id, data, userId),
    delete: (id: string, userId?: string) =>
      ipcRenderer.invoke("users:delete", id, userId),
  },
  roles: {
    list: () => ipcRenderer.invoke("roles:list"),
  },
  branches: {
    list: () => ipcRenderer.invoke("branches:list"),
  },
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld("api", api);

declare global {
  interface Window {
    api: ElectronApi;
  }
}
