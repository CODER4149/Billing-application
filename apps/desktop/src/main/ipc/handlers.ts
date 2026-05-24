import { ipcMain, app } from "electron";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  bootstrapDatabase,
  computeKpis,
  refreshDashboardCache,
} from "@borewell/database";
import { AuditLogService } from "@borewell/core";
import {
  processInvoiceItem,
  calculateInvoiceTotals,
  deriveInvoiceStatus,
} from "@borewell/core";
import type { BetterSqliteAdapter } from "../database/adapter.js";
import { getAppPaths } from "../paths.js";
import { getLogger, registerLogHandlers } from "../logger.js";
import {
  buildInvoiceExtraFields,
  INVOICE_EXTRA_INSERT_COLS,
  invoiceExtraInsertValues,
  INVOICE_EXTRA_UPDATE_SET,
  INVOICE_GET_JOINS,
  INVOICE_GET_SELECT,
} from "./invoiceFields.js";

let adapter: BetterSqliteAdapter | null = null;
let auditService: AuditLogService | null = null;

function strOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

async function syncInvoicePaymentTotals(invoiceId: string): Promise<void> {
  const invoice = await getAdapter().queryOne<{ grand_total: number; due_date: string | null }>(
    "SELECT grand_total, due_date FROM invoices WHERE id = ?",
    [invoiceId]
  );
  if (!invoice) return;

  const paymentSum = await getAdapter().queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?",
    [invoiceId]
  );
  const paidAmount = paymentSum?.total ?? 0;
  const pendingAmount = Math.max(0, invoice.grand_total - paidAmount);
  const status = deriveInvoiceStatus(invoice.grand_total, paidAmount, invoice.due_date);

  await getAdapter().exec(
    "UPDATE invoices SET paid_amount = ?, pending_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
    [paidAmount, pendingAmount, status, invoiceId]
  );
}

async function nextBorewellJobNumber(): Promise<string> {
  const prefix = await getSetting("borewell.prefix", "JOB");
  const nextRaw = await getSetting("borewell.next_number", "1001");
  const next = parseInt(nextRaw, 10) || 1001;
  const jobNumber = `${prefix}-${next}`;
  const existing = await getAdapter().queryOne("SELECT id FROM settings WHERE key = 'borewell.next_number'");
  if (existing) {
    await getAdapter().exec(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'borewell.next_number'",
      [String(next + 1)]
    );
  } else {
    await getAdapter().exec(
      "INSERT INTO settings (id, key, value, category, description) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), "borewell.next_number", String(next + 1), "borewell", "Next job number"]
    );
  }
  return jobNumber;
}

async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await getAdapter().queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? fallback;
}

async function upsertSetting(key: string, value: string): Promise<void> {
  const category = key.includes(".") ? key.split(".")[0]! : "general";
  await getAdapter().exec(
    `INSERT INTO settings (id, key, value, category, description, updated_at)
     VALUES (?, ?, ?, ?, '', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [randomUUID(), key, value, category]
  );
}

export function getAdapter(): BetterSqliteAdapter {
  if (!adapter) throw new Error("Database not initialized");
  return adapter;
}

export async function initDatabase(dbAdapter: BetterSqliteAdapter): Promise<void> {
  adapter = dbAdapter;
  auditService = new AuditLogService(adapter);
  const paths = getAppPaths();
  const result = await bootstrapDatabase({ adapter, paths, includeSampleData: true });
  if (!result.success) {
    throw new Error(result.message ?? "Database bootstrap failed");
  }
  getLogger().info("database", `Database ready at ${result.dbPath}`, {
    message: result.message,
    migrationsApplied: result.migrationsApplied,
    seeded: result.seeded,
  });
}

export function registerIpcHandlers(): void {
  registerLogHandlers();

  ipcMain.handle("app:getInfo", () => ({
    version: app.getVersion(),
    platform: process.platform,
    paths: getAppPaths(),
    isDev: !app.isPackaged,
  }));

  ipcMain.handle("db:query", async (_e, sql: string, params?: unknown[]) => {
    return getAdapter().query(sql, params);
  });

  ipcMain.handle("db:queryOne", async (_e, sql: string, params?: unknown[]) => {
    return getAdapter().queryOne(sql, params);
  });

  ipcMain.handle("db:exec", async (_e, sql: string, params?: unknown[]) => {
    return getAdapter().exec(sql, params);
  });

  ipcMain.handle("auth:login", async (_e, username: string, password: string) => {
    const user = await getAdapter().queryOne<{
      id: string;
      username: string;
      password_hash: string;
      full_name: string;
      role_id: string;
      must_change_password: number;
      is_active: number;
    }>("SELECT * FROM users WHERE username = ? AND is_active = 1", [username]);

    if (!user) return { success: false, error: "Invalid credentials" };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { success: false, error: "Invalid credentials" };

    await getAdapter().exec("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);

    const role = await getAdapter().queryOne<{ name: string }>(
      "SELECT name FROM roles WHERE id = ?", [user.role_id]
    );

    const permissions = await getAdapter().query<{ name: string }>(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ?`, [user.role_id]
    );

    await auditService?.log({
      userId: user.id,
      module: "auth",
      action: "login",
      deviceInfo: process.platform,
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: role?.name ?? "viewer",
        permissions: permissions.map((p: { name: string }) => p.name),
        mustChangePassword: Boolean(user.must_change_password),
      },
    };
  });

  ipcMain.handle("dashboard:getKpis", async () => {
    const cached = await getAdapter().queryOne<{ data: string }>(
      "SELECT data FROM dashboard_cache WHERE cache_key = 'executive_kpis'"
    );
    if (cached) return JSON.parse(cached.data);
    return computeKpis(getAdapter());
  });

  ipcMain.handle("dashboard:refresh", async () => {
    await refreshDashboardCache(getAdapter());
    const cached = await getAdapter().queryOne<{ data: string }>(
      "SELECT data FROM dashboard_cache WHERE cache_key = 'executive_kpis'"
    );
    return cached ? JSON.parse(cached.data) : {};
  });

  ipcMain.handle("dashboard:revenueTrend", async (_e, period: string) => {
    let groupBy = "strftime('%Y-%m-%d', invoice_date)";
    if (period === "weekly") groupBy = "strftime('%Y-W%W', invoice_date)";
    if (period === "monthly") groupBy = "strftime('%Y-%m', invoice_date)";
    if (period === "yearly") groupBy = "strftime('%Y', invoice_date)";

    return getAdapter().query(
      `SELECT ${groupBy} as period, COALESCE(SUM(grand_total), 0) as revenue,
              COALESCE(SUM(paid_amount), 0) as collected
       FROM invoices WHERE status != 'cancelled'
       GROUP BY ${groupBy} ORDER BY period DESC LIMIT 30`
    );
  });

  ipcMain.handle("dashboard:statusDistribution", async () => {
    return getAdapter().query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount
       FROM invoices GROUP BY status`
    );
  });

  ipcMain.handle("dashboard:serviceSplit", async () => {
    return getAdapter().query(
      `SELECT service_type, COALESCE(SUM(total_amount), 0) as revenue
       FROM invoice_items GROUP BY service_type ORDER BY revenue DESC`
    );
  });

  ipcMain.handle("dashboard:topClients", async () => {
    return getAdapter().query(
      `SELECT c.name, COALESCE(SUM(i.grand_total), 0) as revenue,
              COALESCE(SUM(i.pending_amount), 0) as pending
       FROM clients c LEFT JOIN invoices i ON i.client_id = c.id AND i.status != 'cancelled'
       GROUP BY c.id ORDER BY revenue DESC LIMIT 10`
    );
  });

  ipcMain.handle("dashboard:pendingAging", async () => {
    return getAdapter().query(
      `SELECT
        CASE
          WHEN julianday('now') - julianday(invoice_date) <= 30 THEN '0-30 days'
          WHEN julianday('now') - julianday(invoice_date) <= 60 THEN '31-60 days'
          WHEN julianday('now') - julianday(invoice_date) <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as bucket,
        COALESCE(SUM(pending_amount), 0) as amount,
        COUNT(*) as count
       FROM invoices WHERE pending_amount > 0 AND status NOT IN ('paid', 'cancelled')
       GROUP BY bucket`
    );
  });

  ipcMain.handle("settings:getAll", async () => {
    const rows = await getAdapter().query<{ key: string; value: string; category: string }>(
      "SELECT key, value, category FROM settings ORDER BY category, key"
    );
    return rows.reduce<Record<string, string>>((acc: Record<string, string>, row: { key: string; value: string }) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  });

  ipcMain.handle("settings:update", async (_e, settings: Record<string, string>, userId?: string) => {
    for (const [key, value] of Object.entries(settings)) {
      await upsertSetting(key, value);
    }
    await auditService?.log({ userId, module: "settings", action: "update", newValue: settings });
    return { success: true };
  });

  ipcMain.handle("backup:create", async () => {
    const paths = getAppPaths();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(paths.backups, `backup-${timestamp}.db`);
    await getAdapter().backup(dest);
    await auditService?.log({ module: "backup", action: "create", newValue: { path: dest } });
    return { success: true, path: dest };
  });

  ipcMain.handle("backup:list", async () => {
    const paths = getAppPaths();
    if (!fs.existsSync(paths.backups)) return [];
    return fs.readdirSync(paths.backups)
      .filter((f) => f.endsWith(".db"))
      .map((f) => {
        const stat = fs.statSync(path.join(paths.backups, f));
        return { name: f, path: path.join(paths.backups, f), size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  ipcMain.handle("backup:restore", async (_e, backupPath: string) => {
    const paths = getAppPaths();
    const safetyPath = path.join(paths.backups, `pre-restore-${Date.now()}.db`);
    await getAdapter().backup(safetyPath);
    fs.copyFileSync(backupPath, paths.database);
    await auditService?.log({ module: "backup", action: "restore", newValue: { from: backupPath } });
    return { success: true, message: "Restore complete. Please restart the application." };
  });

  ipcMain.handle("audit:getLogs", async (_e, filters: { module?: string; from?: string; to?: string; limit?: number }) => {
    let sql = `SELECT a.*, u.username, u.full_name FROM audit_logs a
               LEFT JOIN users u ON u.id = a.user_id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters.module) { sql += " AND a.module = ?"; params.push(filters.module); }
    if (filters.from) { sql += " AND a.timestamp >= ?"; params.push(filters.from); }
    if (filters.to) { sql += " AND a.timestamp <= ?"; params.push(filters.to); }
    sql += " ORDER BY a.timestamp DESC LIMIT ?";
    params.push(filters.limit ?? 100);
    return getAdapter().query(sql, params);
  });

  ipcMain.handle("clients:list", async () => {
    return getAdapter().query(
      `SELECT c.*, b.name as branch_name,
        (SELECT COUNT(*) FROM invoices WHERE client_id = c.id) as invoice_count
       FROM clients c LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.is_active = 1 ORDER BY c.name`
    );
  });

  ipcMain.handle("clients:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.name || !data.phone) {
        return { success: false, error: "Name and phone are required" };
      }
      const id = randomUUID();
      await getAdapter().exec(
        `INSERT INTO clients (id, name, company_name, email, phone, alternate_phone, secondary_phone, office_phone,
          gstin, pan, address, billing_address, city, state, state_code, pincode, district, taluka, village,
          survey_no, gat_no, site_code, site_address, site_city, site_state, site_district, site_taluka,
          site_village, site_survey_no, site_gat_no, branch_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, strOrNull(data.companyName), strOrNull(data.email), data.phone,
          strOrNull(data.alternatePhone), strOrNull(data.secondaryPhone), strOrNull(data.officePhone),
          strOrNull(data.gstin), strOrNull(data.pan),
          strOrNull(data.address ?? data.billingAddress), strOrNull(data.billingAddress ?? data.address),
          strOrNull(data.city), strOrNull(data.state), strOrNull(data.stateCode), strOrNull(data.pincode),
          strOrNull(data.district), strOrNull(data.taluka), strOrNull(data.village),
          strOrNull(data.surveyNo), strOrNull(data.gatNo), strOrNull(data.siteCode),
          strOrNull(data.siteAddress), strOrNull(data.siteCity), strOrNull(data.siteState),
          strOrNull(data.siteDistrict), strOrNull(data.siteTaluka), strOrNull(data.siteVillage),
          strOrNull(data.siteSurveyNo), strOrNull(data.siteGatNo),
          strOrNull(data.branchId), strOrNull(data.notes),
        ]
      );
      await auditService?.log({ userId, module: "clients", action: "create", newValue: { id, ...data } });
      await refreshDashboardCache(getAdapter());
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create client" };
    }
  });

  ipcMain.handle("clients:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    const old = await getAdapter().queryOne("SELECT * FROM clients WHERE id = ?", [id]);
    await getAdapter().exec(
      `UPDATE clients SET name=?, company_name=?, email=?, phone=?, alternate_phone=?, secondary_phone=?, office_phone=?,
        gstin=?, pan=?, address=?, billing_address=?, city=?, state=?, state_code=?, pincode=?,
        district=?, taluka=?, village=?, survey_no=?, gat_no=?, site_code=?,
        site_address=?, site_city=?, site_state=?, site_district=?, site_taluka=?, site_village=?,
        site_survey_no=?, site_gat_no=?, branch_id=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [
        data.name, data.companyName ?? null, data.email ?? null, data.phone,
        data.alternatePhone ?? null, data.secondaryPhone ?? null, data.officePhone ?? null,
        data.gstin ?? null, data.pan ?? null,
        data.address ?? data.billingAddress ?? null, data.billingAddress ?? data.address ?? null,
        data.city ?? null, data.state ?? null, data.stateCode ?? null, data.pincode ?? null,
        data.district ?? null, data.taluka ?? null, data.village ?? null,
        data.surveyNo ?? null, data.gatNo ?? null, data.siteCode ?? null,
        data.siteAddress ?? null, data.siteCity ?? null, data.siteState ?? null,
        data.siteDistrict ?? null, data.siteTaluka ?? null, data.siteVillage ?? null,
        data.siteSurveyNo ?? null, data.siteGatNo ?? null,
        data.branchId ?? null, data.notes ?? null, id,
      ]
    );
    await auditService?.log({ userId, module: "clients", action: "update", oldValue: old, newValue: data });
    return { success: true };
  });

  ipcMain.handle("clients:delete", async (_e, id: string, userId?: string) => {
    await getAdapter().exec("UPDATE clients SET is_active = 0, updated_at = datetime('now') WHERE id = ?", [id]);
    await auditService?.log({ userId, module: "clients", action: "delete", oldValue: { id } });
    return { success: true };
  });

  ipcMain.handle("invoices:list", async () => {
    return getAdapter().query(
      `SELECT i.*, c.name as client_name FROM invoices i
       JOIN clients c ON c.id = i.client_id ORDER BY i.created_at DESC`
    );
  });

  ipcMain.handle("invoices:get", async (_e, id: string) => {
    const invoice = await getAdapter().queryOne(
      `SELECT ${INVOICE_GET_SELECT}
       FROM invoices i JOIN clients c ON c.id = i.client_id
       ${INVOICE_GET_JOINS} WHERE i.id = ?`, [id]
    );
    const items = await getAdapter().query(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order", [id]
    );
    const payments = await getAdapter().query(
      "SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC", [id]
    );
    return { invoice, items, payments };
  });

  ipcMain.handle("invoices:updateStatus", async (_e, id: string, status: string, userId?: string) => {
    const old = await getAdapter().queryOne("SELECT status FROM invoices WHERE id = ?", [id]);
    await getAdapter().exec(
      "UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]
    );
    await auditService?.log({ userId, module: "invoices", action: "status_change", oldValue: old, newValue: { status } });
    await refreshDashboardCache(getAdapter());
    return { success: true };
  });

  ipcMain.handle("invoices:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      const clientId = data.clientId as string;
      const items = data.items as Array<Record<string, unknown>>;
      if (!clientId) return { success: false, error: "Client is required" };
      if (!items?.length) return { success: false, error: "At least one item is required" };

      const client = await getAdapter().queryOne("SELECT id, name FROM clients WHERE id = ? AND is_active = 1", [clientId]);
      if (!client) return { success: false, error: "Client not found" };

      const isInterState = Boolean(data.isInterState);
      const defaultRates = {
        cgstRate: parseFloat(await getSetting("gst.default_cgst", "9")),
        sgstRate: parseFloat(await getSetting("gst.default_sgst", "9")),
        igstRate: parseFloat(await getSetting("gst.default_igst", "18")),
      };

      const processedItems = items.map((item) =>
        processInvoiceItem(
          {
            description: String(item.description),
            serviceType: String(item.serviceType ?? "other"),
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
            discount: Number(item.discount) || 0,
            hsnCode: item.hsnCode ? String(item.hsnCode) : undefined,
            cgstRate: item.cgstRate !== undefined ? Number(item.cgstRate) : undefined,
            sgstRate: item.sgstRate !== undefined ? Number(item.sgstRate) : undefined,
            igstRate: item.igstRate !== undefined ? Number(item.igstRate) : undefined,
          },
          isInterState,
          defaultRates
        )
      );

      const totals = calculateInvoiceTotals(processedItems);
      const prefix = await getSetting("invoice.prefix", "INV");
      const nextNumber = await getSetting("invoice.next_number", "1001");
      const dueDays = parseInt(await getSetting("invoice.due_days", "30"), 10);
      const invoiceNumber = `${prefix}-${nextNumber}`;
      const invoiceDate = String(data.invoiceDate ?? new Date().toISOString().slice(0, 10));
      let dueDate = data.dueDate ? String(data.dueDate) : null;
      if (!dueDate) {
        const d = new Date(invoiceDate);
        d.setDate(d.getDate() + dueDays);
        dueDate = d.toISOString().slice(0, 10);
      }

      const invoiceId = randomUUID();
      const status = String(data.status ?? deriveInvoiceStatus(totals.grandTotal, 0, dueDate));
      const branchId = strOrNull(data.branchId);
      const extra = buildInvoiceExtraFields(data, totals.grandTotal);
      const defaultTerms = await getSetting("invoice.default_terms", "");
      if (!extra.termsAndConditions && defaultTerms) {
        extra.termsAndConditions = defaultTerms.replace(/\|/g, "\n");
      }

      await getAdapter().transaction(async () => {
        await getAdapter().exec(
          `INSERT INTO invoices (id, invoice_number, client_id, branch_id, status, invoice_date, due_date,
            subtotal, cgst_total, sgst_total, igst_total, tax_total, discount_total, grand_total,
            paid_amount, pending_amount, is_inter_state, notes, terms, created_by, ${INVOICE_EXTRA_INSERT_COLS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ${INVOICE_EXTRA_INSERT_COLS.split(",").map(() => "?").join(", ")})`,
          [
            invoiceId, invoiceNumber, clientId, branchId, status, invoiceDate, dueDate,
            totals.subtotal, totals.cgstTotal, totals.sgstTotal, totals.igstTotal, totals.taxTotal,
            totals.discountTotal, totals.grandTotal, totals.grandTotal,
            isInterState ? 1 : 0, strOrNull(data.notes), strOrNull(data.terms), userId ?? null,
            ...invoiceExtraInsertValues(extra),
          ]
        );

        for (let i = 0; i < processedItems.length; i++) {
          const item = processedItems[i];
          const itemId = randomUUID();
          await getAdapter().exec(
            `INSERT INTO invoice_items (id, invoice_id, description, service_type, hsn_code, quantity, unit, rate,
              amount, discount, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount,
              tax_amount, total_amount, paid_amount, pending_amount, payment_status, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?)`,
            [
              itemId, invoiceId, item.description, item.serviceType, item.hsnCode ?? null,
              item.quantity, "nos", item.rate, item.amount, item.discount ?? 0,
              item.cgstRate, item.sgstRate, item.igstRate,
              item.cgstAmount, item.sgstAmount, item.igstAmount, item.taxAmount, item.totalAmount,
              item.pendingAmount, i + 1,
            ]
          );

          await getAdapter().exec(
            `INSERT INTO gst_records (id, invoice_id, invoice_item_id, record_date, hsn_code,
              taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(), invoiceId, itemId, invoiceDate, item.hsnCode ?? null,
              item.amount, item.cgstAmount, item.sgstAmount, item.igstAmount, item.taxAmount,
            ]
          );
        }

        await getAdapter().exec(
          "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'invoice.next_number'",
          [String(parseInt(nextNumber, 10) + 1)]
        );
      });

      await auditService?.log({
        userId,
        module: "invoices",
        action: "create",
        newValue: { id: invoiceId, invoiceNumber, clientId, totals },
      });
      await refreshDashboardCache(getAdapter());

      return { success: true, id: invoiceId, invoiceNumber };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create invoice" };
    }
  });

  ipcMain.handle("invoices:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const existing = await getAdapter().queryOne<{ paid_amount: number; invoice_number: string }>(
        "SELECT paid_amount, invoice_number FROM invoices WHERE id = ?", [id]
      );
      if (!existing) return { success: false, error: "Invoice not found" };

      const items = data.items as Array<Record<string, unknown>>;
      if (!items?.length) return { success: false, error: "At least one item is required" };

      const isInterState = Boolean(data.isInterState);
      const defaultRates = {
        cgstRate: parseFloat(await getSetting("gst.default_cgst", "9")),
        sgstRate: parseFloat(await getSetting("gst.default_sgst", "9")),
        igstRate: parseFloat(await getSetting("gst.default_igst", "18")),
      };

      const processedItems = items.map((item) =>
        processInvoiceItem(
          {
            description: String(item.description),
            serviceType: String(item.serviceType ?? "other"),
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
            discount: Number(item.discount) || 0,
            hsnCode: item.hsnCode ? String(item.hsnCode) : undefined,
            cgstRate: item.cgstRate !== undefined ? Number(item.cgstRate) : undefined,
            sgstRate: item.sgstRate !== undefined ? Number(item.sgstRate) : undefined,
            igstRate: item.igstRate !== undefined ? Number(item.igstRate) : undefined,
          },
          isInterState,
          defaultRates
        )
      );

      const totals = calculateInvoiceTotals(processedItems);
      const invoiceDate = String(data.invoiceDate);
      const dueDate = data.dueDate ? String(data.dueDate) : null;
      const paidAmount = existing.paid_amount ?? 0;
      const pendingAmount = Math.max(0, totals.grandTotal - paidAmount);
      const status = String(data.status ?? deriveInvoiceStatus(totals.grandTotal, paidAmount, dueDate));
      const extra = buildInvoiceExtraFields(data, totals.grandTotal);

      await getAdapter().transaction(async () => {
        await getAdapter().exec(
          `UPDATE invoices SET client_id=?, status=?, invoice_date=?, due_date=?,
            subtotal=?, cgst_total=?, sgst_total=?, igst_total=?, tax_total=?, discount_total=?,
            grand_total=?, pending_amount=?, is_inter_state=?, notes=?, terms=?,
            ${INVOICE_EXTRA_UPDATE_SET}, updated_at=datetime('now')
           WHERE id=?`,
          [
            data.clientId, status, invoiceDate, dueDate,
            totals.subtotal, totals.cgstTotal, totals.sgstTotal, totals.igstTotal, totals.taxTotal,
            totals.discountTotal, totals.grandTotal, pendingAmount,
            isInterState ? 1 : 0, strOrNull(data.notes), strOrNull(data.terms),
            ...invoiceExtraInsertValues(extra), id,
          ]
        );

        await getAdapter().exec("DELETE FROM gst_records WHERE invoice_id = ?", [id]);
        await getAdapter().exec("DELETE FROM invoice_items WHERE invoice_id = ?", [id]);

        for (let i = 0; i < processedItems.length; i++) {
          const item = processedItems[i];
          const itemId = randomUUID();
          await getAdapter().exec(
            `INSERT INTO invoice_items (id, invoice_id, description, service_type, hsn_code, quantity, unit, rate,
              amount, discount, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount,
              tax_amount, total_amount, paid_amount, pending_amount, payment_status, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?)`,
            [
              itemId, id, item.description, item.serviceType, item.hsnCode ?? null,
              item.quantity, String(data.unit ?? "nos"), item.rate, item.amount, item.discount ?? 0,
              item.cgstRate, item.sgstRate, item.igstRate,
              item.cgstAmount, item.sgstAmount, item.igstAmount, item.taxAmount, item.totalAmount,
              item.totalAmount, i + 1,
            ]
          );
          await getAdapter().exec(
            `INSERT INTO gst_records (id, invoice_id, invoice_item_id, record_date, hsn_code,
              taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(), id, itemId, invoiceDate, item.hsnCode ?? null,
              item.amount, item.cgstAmount, item.sgstAmount, item.igstAmount, item.taxAmount,
            ]
          );
        }
      });

      await auditService?.log({
        userId,
        module: "invoices",
        action: "update",
        newValue: { id, invoiceNumber: existing.invoice_number, totals, status },
      });
      await refreshDashboardCache(getAdapter());
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update invoice" };
    }
  });

  ipcMain.handle("invoices:delete", async (_e, id: string, userId?: string) => {
    try {
      await getAdapter().exec("UPDATE invoices SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [id]);
      await auditService?.log({ userId, module: "invoices", action: "delete", oldValue: { id } });
      await refreshDashboardCache(getAdapter());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to cancel invoice" };
    }
  });

  ipcMain.handle("payments:list", async () => {
    return getAdapter().query(
      `SELECT p.*, i.invoice_number, c.name as client_name
       FROM payments p JOIN invoices i ON i.id = p.invoice_id
       JOIN clients c ON c.id = i.client_id ORDER BY p.payment_date DESC`
    );
  });

  ipcMain.handle("payments:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.invoiceId || !data.amount || !data.paymentDate) {
        return { success: false, error: "Invoice, amount, and date are required" };
      }
      const invoice = await getAdapter().queryOne<{ id: string; pending_amount: number }>(
        "SELECT id, pending_amount FROM invoices WHERE id = ? AND status != 'cancelled'",
        [data.invoiceId]
      );
      if (!invoice) return { success: false, error: "Invoice not found" };

      const amount = Number(data.amount);
      if (amount <= 0) return { success: false, error: "Amount must be positive" };

      const id = randomUUID();
      await getAdapter().exec(
        `INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.invoiceId, amount, data.paymentDate,
          data.paymentMethod ?? "cash", strOrNull(data.referenceNumber),
          strOrNull(data.notes), userId ?? null,
        ]
      );
      await syncInvoicePaymentTotals(String(data.invoiceId));
      await auditService?.log({ userId, module: "payments", action: "create", newValue: { id, ...data } });
      await refreshDashboardCache(getAdapter());
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to record payment" };
    }
  });

  ipcMain.handle("payments:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const old = await getAdapter().queryOne("SELECT * FROM payments WHERE id = ?", [id]);
      if (!old) return { success: false, error: "Payment not found" };

      await getAdapter().exec(
        `UPDATE payments SET invoice_id=?, amount=?, payment_date=?, payment_method=?,
          reference_number=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.invoiceId ?? old.invoice_id, Number(data.amount ?? old.amount),
          data.paymentDate ?? old.payment_date, data.paymentMethod ?? old.payment_method,
          strOrNull(data.referenceNumber ?? old.reference_number),
          strOrNull(data.notes ?? old.notes), id,
        ]
      );
      await syncInvoicePaymentTotals(String(data.invoiceId ?? old.invoice_id));
      if (data.invoiceId && data.invoiceId !== old.invoice_id) {
        await syncInvoicePaymentTotals(String(old.invoice_id));
      }
      await auditService?.log({ userId, module: "payments", action: "update", oldValue: old, newValue: data });
      await refreshDashboardCache(getAdapter());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update payment" };
    }
  });

  ipcMain.handle("payments:delete", async (_e, id: string, userId?: string) => {
    try {
      const old = await getAdapter().queryOne<{ invoice_id: string }>("SELECT invoice_id FROM payments WHERE id = ?", [id]);
      if (!old) return { success: false, error: "Payment not found" };

      await getAdapter().exec("DELETE FROM payments WHERE id = ?", [id]);
      await syncInvoicePaymentTotals(old.invoice_id);
      await auditService?.log({ userId, module: "payments", action: "delete", oldValue: { id } });
      await refreshDashboardCache(getAdapter());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete payment" };
    }
  });

  ipcMain.handle("borewell:list", async () => {
    return getAdapter().query(
      `SELECT j.*, c.name as client_name FROM borewell_jobs j
       JOIN clients c ON c.id = j.client_id ORDER BY j.created_at DESC`
    );
  });

  ipcMain.handle("borewell:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.clientId || !data.siteAddress) {
        return { success: false, error: "Client and site address are required" };
      }
      const id = randomUUID();
      const jobNumber = await nextBorewellJobNumber();
      await getAdapter().exec(
        `INSERT INTO borewell_jobs (id, job_number, client_id, site_address, start_date, end_date, status,
          total_depth, water_found_at, water_success, drilling_cost, casing_depth, pump_type, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, jobNumber, data.clientId, data.siteAddress,
          strOrNull(data.startDate), strOrNull(data.endDate), data.status ?? "pending",
          Number(data.totalDepth ?? 0), data.waterFoundAt != null ? Number(data.waterFoundAt) : null,
          data.waterSuccess ? 1 : 0, Number(data.drillingCost ?? 0),
          data.casingDepth != null ? Number(data.casingDepth) : null,
          strOrNull(data.pumpType), strOrNull(data.notes), userId ?? null,
        ]
      );
      await auditService?.log({ userId, module: "borewell", action: "create", newValue: { id, jobNumber, ...data } });
      await refreshDashboardCache(getAdapter());
      return { success: true, id, jobNumber };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create job" };
    }
  });

  ipcMain.handle("borewell:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const old = await getAdapter().queryOne("SELECT * FROM borewell_jobs WHERE id = ?", [id]);
      if (!old) return { success: false, error: "Job not found" };

      await getAdapter().exec(
        `UPDATE borewell_jobs SET client_id=?, site_address=?, start_date=?, end_date=?, status=?,
          total_depth=?, water_found_at=?, water_success=?, drilling_cost=?, casing_depth=?,
          pump_type=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.clientId ?? old.client_id, data.siteAddress ?? old.site_address,
          strOrNull(data.startDate ?? old.start_date), strOrNull(data.endDate ?? old.end_date),
          data.status ?? old.status, Number(data.totalDepth ?? old.total_depth),
          data.waterFoundAt != null ? Number(data.waterFoundAt) : old.water_found_at,
          data.waterSuccess != null ? (data.waterSuccess ? 1 : 0) : old.water_success,
          Number(data.drillingCost ?? old.drilling_cost),
          data.casingDepth != null ? Number(data.casingDepth) : old.casing_depth,
          strOrNull(data.pumpType ?? old.pump_type), strOrNull(data.notes ?? old.notes), id,
        ]
      );
      await auditService?.log({ userId, module: "borewell", action: "update", oldValue: old, newValue: data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update job" };
    }
  });

  ipcMain.handle("borewell:delete", async (_e, id: string, userId?: string) => {
    try {
      await getAdapter().exec("DELETE FROM borewell_jobs WHERE id = ?", [id]);
      await auditService?.log({ userId, module: "borewell", action: "delete", oldValue: { id } });
      await refreshDashboardCache(getAdapter());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete job" };
    }
  });

  ipcMain.handle("vehicles:list", async () => {
    return getAdapter().query("SELECT * FROM vehicles ORDER BY name");
  });

  ipcMain.handle("vehicles:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.name || !data.registrationNumber) {
        return { success: false, error: "Name and registration are required" };
      }
      const id = randomUUID();
      await getAdapter().exec(
        `INSERT INTO vehicles (id, name, registration_number, vehicle_type, make, model, year, status, fuel_type,
          driver_name, operator_name, transport_details, survey_no, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, data.registrationNumber, data.vehicleType ?? "truck",
          strOrNull(data.make), strOrNull(data.model),
          data.year != null ? Number(data.year) : null,
          data.status ?? "active", strOrNull(data.fuelType),
          strOrNull(data.driverName), strOrNull(data.operatorName), strOrNull(data.transportDetails),
          strOrNull(data.surveyNo), strOrNull(data.notes),
        ]
      );
      await auditService?.log({ userId, module: "vehicles", action: "create", newValue: { id, ...data } });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create vehicle" };
    }
  });

  ipcMain.handle("vehicles:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const old = await getAdapter().queryOne("SELECT * FROM vehicles WHERE id = ?", [id]);
      if (!old) return { success: false, error: "Vehicle not found" };

      await getAdapter().exec(
        `UPDATE vehicles SET name=?, registration_number=?, vehicle_type=?, make=?, model=?,
          year=?, status=?, fuel_type=?, driver_name=?, operator_name=?, transport_details=?, survey_no=?, notes=?,
          updated_at=datetime('now') WHERE id=?`,
        [
          data.name ?? old.name, data.registrationNumber ?? old.registration_number,
          data.vehicleType ?? old.vehicle_type, strOrNull(data.make ?? old.make),
          strOrNull(data.model ?? old.model), data.year != null ? Number(data.year) : old.year,
          data.status ?? old.status, strOrNull(data.fuelType ?? old.fuel_type),
          strOrNull(data.driverName ?? old.driver_name), strOrNull(data.operatorName ?? old.operator_name),
          strOrNull(data.transportDetails ?? old.transport_details),
          strOrNull(data.surveyNo ?? old.survey_no),
          strOrNull(data.notes ?? old.notes), id,
        ]
      );
      await auditService?.log({ userId, module: "vehicles", action: "update", oldValue: old, newValue: data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update vehicle" };
    }
  });

  ipcMain.handle("vehicles:delete", async (_e, id: string, userId?: string) => {
    try {
      await getAdapter().exec("UPDATE vehicles SET status = 'inactive', updated_at = datetime('now') WHERE id = ?", [id]);
      await auditService?.log({ userId, module: "vehicles", action: "delete", oldValue: { id } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to remove vehicle" };
    }
  });

  ipcMain.handle("expenses:list", async () => {
    return getAdapter().query(
      `SELECT e.*, v.name as vehicle_name FROM expenses e
       LEFT JOIN vehicles v ON v.id = e.vehicle_id ORDER BY e.expense_date DESC`
    );
  });

  ipcMain.handle("expenses:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.category || !data.description || !data.amount || !data.expenseDate) {
        return { success: false, error: "Category, description, amount, and date are required" };
      }
      const id = randomUUID();
      await getAdapter().exec(
        `INSERT INTO expenses (id, category, description, amount, expense_date, payment_method,
          vehicle_id, borewell_job_id, receipt_number, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.category, data.description, Number(data.amount), data.expenseDate,
          data.paymentMethod ?? "cash", strOrNull(data.vehicleId), strOrNull(data.borewellJobId),
          strOrNull(data.receiptNumber), strOrNull(data.notes), userId ?? null,
        ]
      );
      await auditService?.log({ userId, module: "expenses", action: "create", newValue: { id, ...data } });
      await refreshDashboardCache(getAdapter());
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create expense" };
    }
  });

  ipcMain.handle("expenses:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const old = await getAdapter().queryOne("SELECT * FROM expenses WHERE id = ?", [id]);
      if (!old) return { success: false, error: "Expense not found" };

      await getAdapter().exec(
        `UPDATE expenses SET category=?, description=?, amount=?, expense_date=?, payment_method=?,
          vehicle_id=?, borewell_job_id=?, receipt_number=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.category ?? old.category, data.description ?? old.description,
          Number(data.amount ?? old.amount), data.expenseDate ?? old.expense_date,
          data.paymentMethod ?? old.payment_method, strOrNull(data.vehicleId ?? old.vehicle_id),
          strOrNull(data.borewellJobId ?? old.borewell_job_id),
          strOrNull(data.receiptNumber ?? old.receipt_number),
          strOrNull(data.notes ?? old.notes), id,
        ]
      );
      await auditService?.log({ userId, module: "expenses", action: "update", oldValue: old, newValue: data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update expense" };
    }
  });

  ipcMain.handle("expenses:delete", async (_e, id: string, userId?: string) => {
    try {
      await getAdapter().exec("DELETE FROM expenses WHERE id = ?", [id]);
      await auditService?.log({ userId, module: "expenses", action: "delete", oldValue: { id } });
      await refreshDashboardCache(getAdapter());
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete expense" };
    }
  });

  ipcMain.handle("gst:summary", async (_e, year?: string) => {
    const y = year ?? new Date().getFullYear().toString();
    return getAdapter().query(
      `SELECT strftime('%Y-%m', record_date) as month,
              COALESCE(SUM(taxable_amount), 0) as taxable,
              COALESCE(SUM(cgst_amount), 0) as cgst,
              COALESCE(SUM(sgst_amount), 0) as sgst,
              COALESCE(SUM(igst_amount), 0) as igst,
              COALESCE(SUM(total_tax), 0) as total_tax
       FROM gst_records WHERE strftime('%Y', record_date) = ?
       GROUP BY month ORDER BY month`, [y]
    );
  });

  ipcMain.handle("users:list", async () => {
    return getAdapter().query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login_at, r.name as role, u.role_id
       FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.full_name`
    );
  });

  ipcMain.handle("roles:list", async () => {
    return getAdapter().query("SELECT id, name, description FROM roles ORDER BY name");
  });

  ipcMain.handle("users:create", async (_e, data: Record<string, unknown>, userId?: string) => {
    try {
      if (!data.username || !data.fullName || !data.role) {
        return { success: false, error: "Username, full name, and role are required" };
      }
      const role = await getAdapter().queryOne<{ id: string }>(
        "SELECT id FROM roles WHERE name = ?", [data.role]
      );
      if (!role) return { success: false, error: "Invalid role" };

      const password = String(data.password ?? "admin123");
      const passwordHash = await bcrypt.hash(password, 12);
      const id = randomUUID();

      await getAdapter().exec(
        `INSERT INTO users (id, username, email, password_hash, full_name, role_id, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.username, strOrNull(data.email), passwordHash, data.fullName, role.id, 1]
      );
      await auditService?.log({ userId, module: "users", action: "create", newValue: { id, username: data.username, role: data.role } });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
    }
  });

  ipcMain.handle("users:update", async (_e, id: string, data: Record<string, unknown>, userId?: string) => {
    try {
      const old = await getAdapter().queryOne("SELECT * FROM users WHERE id = ?", [id]);
      if (!old) return { success: false, error: "User not found" };

      let roleId = old.role_id;
      if (data.role) {
        const role = await getAdapter().queryOne<{ id: string }>(
          "SELECT id FROM roles WHERE name = ?", [data.role]
        );
        if (!role) return { success: false, error: "Invalid role" };
        roleId = role.id;
      }

      if (data.password) {
        const passwordHash = await bcrypt.hash(String(data.password), 12);
        await getAdapter().exec(
          `UPDATE users SET username=?, email=?, full_name=?, role_id=?, is_active=?,
            password_hash=?, must_change_password=1, updated_at=datetime('now') WHERE id=?`,
          [
            data.username ?? old.username, strOrNull(data.email ?? old.email),
            data.fullName ?? old.full_name, roleId,
            data.isActive != null ? (data.isActive ? 1 : 0) : old.is_active,
            passwordHash, id,
          ]
        );
      } else {
        await getAdapter().exec(
          `UPDATE users SET username=?, email=?, full_name=?, role_id=?, is_active=?,
            updated_at=datetime('now') WHERE id=?`,
          [
            data.username ?? old.username, strOrNull(data.email ?? old.email),
            data.fullName ?? old.full_name, roleId,
            data.isActive != null ? (data.isActive ? 1 : 0) : old.is_active, id,
          ]
        );
      }
      await auditService?.log({ userId, module: "users", action: "update", oldValue: { id: old.id, username: old.username }, newValue: data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update user" };
    }
  });

  ipcMain.handle("users:delete", async (_e, id: string, userId?: string) => {
    try {
      await getAdapter().exec("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?", [id]);
      await auditService?.log({ userId, module: "users", action: "delete", oldValue: { id } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to deactivate user" };
    }
  });

  ipcMain.handle("branches:list", async () => {
    return getAdapter().query("SELECT * FROM branches WHERE is_active = 1 ORDER BY name");
  });
}
