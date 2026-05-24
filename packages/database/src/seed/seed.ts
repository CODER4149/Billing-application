import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { DatabaseAdapter } from "../adapters/types.js";

const DEFAULT_PERMISSIONS = [
  { module: "clients", actions: ["read", "write", "delete"] },
  { module: "invoices", actions: ["read", "write", "delete", "export"] },
  { module: "payments", actions: ["read", "write", "delete"] },
  { module: "borewell", actions: ["read", "write", "delete"] },
  { module: "vehicles", actions: ["read", "write", "delete"] },
  { module: "expenses", actions: ["read", "write", "delete"] },
  { module: "gst", actions: ["read", "export"] },
  { module: "analytics", actions: ["read"] },
  { module: "logs", actions: ["read", "export"] },
  { module: "settings", actions: ["read", "write"] },
  { module: "users", actions: ["read", "write", "delete"] },
  { module: "backup", actions: ["read", "write"] },
];

const ROLES = [
  { name: "admin", description: "Full system access" },
  { name: "manager", description: "Manage operations and billing" },
  { name: "accountant", description: "Billing and payments access" },
  { name: "operator", description: "Field operations access" },
  { name: "viewer", description: "Read-only access" },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: string; category: string; description: string }> = [
  { key: "company.name", value: "Bhagyalaxmi Borewell", category: "company", description: "Company name" },
  { key: "company.address", value: "123 Industrial Area", category: "company", description: "Company address" },
  { key: "company.city", value: "Pune", category: "company", description: "City" },
  { key: "company.state", value: "Maharashtra", category: "company", description: "State" },
  { key: "company.pincode", value: "411001", category: "company", description: "Pincode" },
  { key: "company.phone", value: "+91 9876543210", category: "company", description: "Primary phone" },
  { key: "company.proprietor", value: "", category: "company", description: "Proprietor name" },
  { key: "company.phone2", value: "", category: "company", description: "Additional phone 1" },
  { key: "company.phone3", value: "", category: "company", description: "Additional phone 2" },
  { key: "company.phone4", value: "", category: "company", description: "Additional phone 3" },
  { key: "company.email", value: "info@borewellerp.com", category: "company", description: "Email" },
  { key: "company.gstin", value: "27AAAAA0000A1Z5", category: "company", description: "GSTIN" },
  { key: "gst.default_cgst", value: "9", category: "gst", description: "Default CGST rate (%)" },
  { key: "gst.default_sgst", value: "9", category: "gst", description: "Default SGST rate (%)" },
  { key: "gst.default_igst", value: "18", category: "gst", description: "Default IGST rate (%)" },
  { key: "invoice.prefix", value: "INV", category: "invoice", description: "Invoice number prefix" },
  { key: "invoice.next_number", value: "1001", category: "invoice", description: "Next invoice number" },
  { key: "invoice.due_days", value: "30", category: "invoice", description: "Default due days" },
  { key: "theme.mode", value: "system", category: "theme", description: "Theme mode" },
  { key: "backup.auto_enabled", value: "true", category: "backup", description: "Auto backup enabled" },
  { key: "backup.schedule", value: "daily", category: "backup", description: "Backup schedule" },
  { key: "backup.retention_days", value: "30", category: "backup", description: "Backup retention days" },
];

export async function seedDatabase(adapter: DatabaseAdapter): Promise<boolean> {
  const existing = await adapter.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM users"
  );
  if (existing && existing.count > 0) {
    return false;
  }

  const roleIds: Record<string, string> = {};
  for (const role of ROLES) {
    const id = randomUUID();
    roleIds[role.name] = id;
    await adapter.exec(
      "INSERT INTO roles (id, name, description) VALUES (?, ?, ?)",
      [id, role.name, role.description]
    );
  }

  const permissionIds: Record<string, string> = {};
  for (const perm of DEFAULT_PERMISSIONS) {
    for (const action of perm.actions) {
      const name = `${perm.module}:${action}`;
      const id = randomUUID();
      permissionIds[name] = id;
      await adapter.exec(
        "INSERT INTO permissions (id, name, module, action, description) VALUES (?, ?, ?, ?, ?)",
        [id, name, perm.module, action, `${action} ${perm.module}`]
      );
    }
  }

  for (const permId of Object.values(permissionIds)) {
    await adapter.exec(
      "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)",
      [randomUUID(), roleIds.admin, permId]
    );
  }

  const managerPerms = Object.entries(permissionIds).filter(
    ([name]) => !name.startsWith("users:delete") && !name.startsWith("backup:write")
  );
  for (const [, permId] of managerPerms) {
    await adapter.exec(
      "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)",
      [randomUUID(), roleIds.manager, permId]
    );
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminId = randomUUID();
  await adapter.exec(
    `INSERT INTO users (id, username, email, password_hash, full_name, role_id, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminId, "admin", "admin@borewellerp.com", passwordHash, "System Administrator", roleIds.admin, 1]
  );

  const branchId = randomUUID();
  await adapter.exec(
    `INSERT INTO branches (id, name, code, address, city, state, pincode, phone, email, gstin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [branchId, "Head Office", "HO", "123 Industrial Area", "Pune", "Maharashtra", "411001", "+91 9876543210", "info@borewellerp.com", "27AAAAA0000A1Z5"]
  );

  for (const setting of DEFAULT_SETTINGS) {
    await adapter.exec(
      "INSERT INTO settings (id, key, value, category, description) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), setting.key, setting.value, setting.category, setting.description]
    );
  }

  await adapter.exec(
    `INSERT INTO activity_logs (id, level, module, message) VALUES (?, ?, ?, ?)`,
    [randomUUID(), "info", "system", "Database seeded with default data"]
  );

  return true;
}

export async function seedSampleData(adapter: DatabaseAdapter): Promise<void> {
  const clientExists = await adapter.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM clients"
  );
  if (clientExists && clientExists.count > 0) return;

  const admin = await adapter.queryOne<{ id: string }>("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
  const branch = await adapter.queryOne<{ id: string }>("SELECT id FROM branches LIMIT 1");
  if (!admin || !branch) return;

  const clientId = randomUUID();
  await adapter.exec(
    `INSERT INTO clients (id, name, company_name, phone, email, address, city, state, pincode, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, "Rajesh Kumar", "Kumar Farms", "9876543210", "rajesh@kumarfarms.com", "Village Road, Taluka", "Pune", "Maharashtra", "412101", branch.id]
  );

  const invoiceId = randomUUID();
  const invoiceNumber = "INV-1001";
  await adapter.exec(
    `INSERT INTO invoices (id, invoice_number, client_id, branch_id, status, invoice_date, due_date,
      subtotal, cgst_total, sgst_total, tax_total, grand_total, pending_amount, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceId, invoiceNumber, clientId, branch.id, "payment_pending", "2025-05-01", "2025-05-31",
      228000, 20520, 20520, 41040, 269040, 269040, admin.id]
  );

  const item1Id = randomUUID();
  const item2Id = randomUUID();
  await adapter.exec(
    `INSERT INTO invoice_items (id, invoice_id, description, service_type, quantity, rate, amount,
      cgst_rate, sgst_rate, cgst_amount, sgst_amount, tax_amount, total_amount, pending_amount, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item1Id, invoiceId, "Drilling Work - 400 ft", "drilling", 400, 570, 228000, 9, 9, 20520, 20520, 41040, 269040, 269040, 1]
  );
  await adapter.exec(
    `INSERT INTO invoice_items (id, invoice_id, description, service_type, quantity, rate, amount,
      cgst_rate, sgst_rate, cgst_amount, sgst_amount, tax_amount, total_amount, paid_amount, pending_amount, payment_status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item2Id, invoiceId, "PVC Pipe 4 inch", "pvc_pipe", 1, 51200, 51200, 9, 9, 4608, 4608, 9216, 60416, 60416, 0, "paid", 2]
  );

  await adapter.exec(
    "UPDATE settings SET value = '1002' WHERE key = 'invoice.next_number'"
  );
}
