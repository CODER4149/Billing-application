export interface DatabaseAdapter {
  exec(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  getDbPath(): string;
  backup(destPath: string): Promise<void>;
  close(): Promise<void>;
}

export interface AppPaths {
  root: string;
  database: string;
  backups: string;
  logs: string;
  exports: string;
  invoices: string;
}

export interface BootstrapResult {
  success: boolean;
  dbPath: string;
  migrationsApplied: string[];
  seeded: boolean;
  message: string;
}
