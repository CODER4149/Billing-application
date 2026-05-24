export interface ElectronApi {
  app: { getInfo(): Promise<{ version: string; platform: string; paths: Record<string, string> }> };
  auth: { login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: Record<string, unknown> }> };
  dashboard: {
    getKpis(): Promise<Record<string, number>>;
    refresh(): Promise<Record<string, number>>;
    revenueTrend(period: string): Promise<Array<Record<string, unknown>>>;
    statusDistribution(): Promise<Array<Record<string, unknown>>>;
    serviceSplit(): Promise<Array<Record<string, unknown>>>;
    topClients(): Promise<Array<Record<string, unknown>>>;
    pendingAging(): Promise<Array<Record<string, unknown>>>;
  };
  clients: {
    list(): Promise<Array<Record<string, unknown>>>;
    create(data: Record<string, unknown>, userId?: string): Promise<{ success: boolean; id: string }>;
    update(id: string, data: Record<string, unknown>, userId?: string): Promise<{ success: boolean }>;
    delete(id: string, userId?: string): Promise<{ success: boolean }>;
  };
  invoices: {
    list(): Promise<Array<Record<string, unknown>>>;
    get(id: string): Promise<{ invoice: Record<string, unknown>; items: Array<Record<string, unknown>>; payments: Array<Record<string, unknown>> }>;
    updateStatus(id: string, status: string, userId?: string): Promise<{ success: boolean }>;
  };
  payments: { list(): Promise<Array<Record<string, unknown>>> };
  borewell: { list(): Promise<Array<Record<string, unknown>>> };
  vehicles: { list(): Promise<Array<Record<string, unknown>>> };
  expenses: { list(): Promise<Array<Record<string, unknown>>> };
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
  audit: { getLogs(filters: Record<string, unknown>): Promise<Array<Record<string, unknown>>> };
  users: { list(): Promise<Array<Record<string, unknown>>> };
  branches: { list(): Promise<Array<Record<string, unknown>>> };
}

declare global {
  interface Window {
    api?: ElectronApi;
  }
}

export {};
