export interface ApiClient {
  app: {
    getInfo(): Promise<{ version: string; platform: string; paths: Record<string, string> }>;
    writeLog?(
      level: "DEBUG" | "INFO" | "WARN" | "ERROR",
      source: string,
      message: string,
      details?: unknown,
      location?: string
    ): Promise<{ success: boolean }>;
  };
  logs?: {
    getInfo(): Promise<{ folder: string; todayFile: string; retentionDays: number }>;
    openFolder(): Promise<{ success: boolean; path: string }>;
    openToday(): Promise<{ success: boolean; path: string }>;
  };
  auth: {
    login(username: string, password: string): Promise<{
      success: boolean;
      error?: string;
      user?: {
        id: string;
        username: string;
        fullName: string;
        role: string;
        permissions: string[];
        mustChangePassword: boolean;
      };
    }>;
  };
  dashboard: {
    getKpis(): Promise<Record<string, number>>;
    refresh(): Promise<Record<string, number>>;
    revenueTrend(period: string): Promise<Array<{ period: string; revenue: number; collected: number }>>;
    statusDistribution(): Promise<Array<{ status: string; count: number; amount: number }>>;
    serviceSplit(): Promise<Array<{ service_type: string; revenue: number }>>;
    topClients(): Promise<Array<{ name: string; revenue: number; pending: number }>>;
    pendingAging(): Promise<Array<{ bucket: string; amount: number; count: number }>>;
  };
  clients: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean }>;
    delete(id: string, userId?: string): Promise<{ success: boolean }>;
  };
  invoices: {
    list(): Promise<Array<Record<string, unknown>>>;
    get(id: string): Promise<{ invoice: Record<string, unknown>; items: Array<Record<string, unknown>>; payments: Array<Record<string, unknown>> }>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; invoiceNumber?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
    updateStatus(id: string, status: string, userId?: string): Promise<{ success: boolean }>;
  };
  payments: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  };
  borewell: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; jobNumber?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  };
  vehicles: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  };
  expenses: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  };
  gst: { summary(year?: string): Promise<Array<Record<string, unknown>>> };
  settings: {
    getAll(): Promise<Record<string, string>>;
    update(settings: Record<string, string>, userId?: string): Promise<{ success: boolean }>;
  };
  backup: {
    create(): Promise<{ success: boolean; path: string }>;
    list(): Promise<Array<{ name: string; path: string; size: number; createdAt: string }>>;
    restore(path: string): Promise<{ success: boolean; message: string }>;
  };
  audit: {
    getLogs(filters: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  };
  users: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id?: string; error?: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; error?: string }>;
    delete(id: string, userId?: string): Promise<{ success: boolean; error?: string }>;
  };
  roles: { list(): Promise<Array<Record<string, unknown>>> };
  branches: { list(): Promise<Array<Record<string, unknown>>> };
}

import { createMockApi } from "./mockApi";

export const api: ApiClient = typeof window !== "undefined" && window.api
  ? (window.api as unknown as ApiClient)
  : createMockApi();
