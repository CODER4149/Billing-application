import type { DatabaseAdapter } from "@borewell/database";
import { randomUUID } from "node:crypto";

export interface AuditLogInput {
  userId?: string | null;
  module: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  deviceInfo?: string;
  remarks?: string;
}

export class AuditLogService {
  constructor(private adapter: DatabaseAdapter) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.adapter.exec(
      `INSERT INTO audit_logs (id, user_id, module, action, old_value, new_value, device_info, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.userId ?? null,
        input.module,
        input.action,
        input.oldValue ? JSON.stringify(input.oldValue) : null,
        input.newValue ? JSON.stringify(input.newValue) : null,
        input.deviceInfo ?? null,
        input.remarks ?? null,
      ]
    );
  }

  async logActivity(level: string, module: string, message: string, metadata?: unknown): Promise<void> {
    await this.adapter.exec(
      `INSERT INTO activity_logs (id, level, module, message, metadata) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), level, module, message, metadata ? JSON.stringify(metadata) : null]
    );
  }
}
