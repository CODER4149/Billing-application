import { randomUUID } from "node:crypto";
import { migrateUp } from "../migrations/runner.js";
import { seedDatabase, seedSampleData } from "../seed/seed.js";
import type { DatabaseAdapter, AppPaths, BootstrapResult } from "../adapters/types.js";

export interface BootstrapOptions {
  adapter: DatabaseAdapter;
  paths: AppPaths;
  includeSampleData?: boolean;
}

export async function bootstrapDatabase(options: BootstrapOptions): Promise<BootstrapResult> {
  const { adapter, paths, includeSampleData = true } = options;

  try {
    const migrationsApplied = await migrateUp(adapter);
    const seeded = await seedDatabase(adapter);

    if (includeSampleData && seeded) {
      await seedSampleData(adapter);
    }

    await warmDashboardCache(adapter);

    await adapter.exec(
      `INSERT INTO activity_logs (id, level, module, message, metadata) VALUES (?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        "info",
        "system",
        "Application database initialized",
        JSON.stringify({ dbPath: paths.database, migrationsApplied }),
      ]
    );

    return {
      success: true,
      dbPath: adapter.getDbPath(),
      migrationsApplied,
      seeded,
      message: seeded ? "Database created and seeded successfully" : "Database migrated successfully",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error";
    console.error("[database] Bootstrap failed:", message);
    throw new Error(`Database bootstrap failed: ${message}`);
  }
}

async function warmDashboardCache(adapter: DatabaseAdapter): Promise<void> {
  const kpis = await computeKpis(adapter);
  const existing = await adapter.queryOne<{ id: string }>(
    "SELECT id FROM dashboard_cache WHERE cache_key = 'executive_kpis'"
  );

  if (existing) {
    await adapter.exec(
      "UPDATE dashboard_cache SET data = ?, computed_at = datetime('now') WHERE cache_key = 'executive_kpis'",
      [JSON.stringify(kpis)]
    );
  } else {
    await adapter.exec(
      "INSERT INTO dashboard_cache (id, cache_key, period, data) VALUES (?, ?, ?, ?)",
      [randomUUID(), "executive_kpis", "all", JSON.stringify(kpis)]
    );
  }
}

export async function computeKpis(adapter: DatabaseAdapter): Promise<Record<string, number>> {
  const revenue = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE status != 'cancelled'"
  );
  const paid = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(paid_amount), 0) as total FROM invoices WHERE status != 'cancelled'"
  );
  const pending = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(pending_amount), 0) as total FROM invoices WHERE status NOT IN ('cancelled', 'paid')"
  );
  const gst = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(tax_total), 0) as total FROM invoices WHERE status != 'cancelled'"
  );
  const todayBilling = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE invoice_date = date('now') AND status != 'cancelled'"
  );
  const monthlyRevenue = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now') AND status != 'cancelled'"
  );
  const overdue = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(pending_amount), 0) as total FROM invoices WHERE status = 'overdue' OR (due_date < date('now') AND pending_amount > 0 AND status NOT IN ('paid', 'cancelled'))"
  );
  const avgInvoice = await adapter.queryOne<{ avg: number }>(
    "SELECT COALESCE(AVG(grand_total), 0) as avg FROM invoices WHERE status != 'cancelled'"
  );
  const totalJobs = await adapter.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM borewell_jobs"
  );
  const expenses = await adapter.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses"
  );

  const totalRevenue = revenue?.total ?? 0;
  const totalExpenses = expenses?.total ?? 0;

  return {
    totalRevenue,
    totalPaid: paid?.total ?? 0,
    totalPending: pending?.total ?? 0,
    gstCollected: gst?.total ?? 0,
    todayBilling: todayBilling?.total ?? 0,
    monthlyRevenue: monthlyRevenue?.total ?? 0,
    overdueAmount: overdue?.total ?? 0,
    averageInvoiceValue: avgInvoice?.avg ?? 0,
    totalJobs: totalJobs?.count ?? 0,
    profitEstimate: totalRevenue - totalExpenses,
  };
}

export async function refreshDashboardCache(adapter: DatabaseAdapter): Promise<void> {
  await warmDashboardCache(adapter);
}
