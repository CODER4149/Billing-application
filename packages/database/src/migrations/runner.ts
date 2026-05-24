import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseAdapter } from "../adapters/types.js";

export interface MigrationJournal {
  revisions: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getMigrationsDir(): string {
  return join(__dirname, "..", "migrations", "sql");
}

export function loadJournal(): MigrationJournal {
  const journalPath = join(getMigrationsDir(), "..", "meta", "_journal.json");
  if (!existsSync(journalPath)) {
    return { revisions: [] };
  }
  return JSON.parse(readFileSync(journalPath, "utf-8")) as MigrationJournal;
}

export async function getAppliedRevisions(adapter: DatabaseAdapter): Promise<string[]> {
  try {
    const rows = await adapter.query<{ revision: string }>(
      "SELECT revision FROM schema_migrations ORDER BY applied_at ASC"
    );
    return rows.map((r) => r.revision);
  } catch {
    return [];
  }
}

function parseSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((statement) => statement.length > 0);
}

export async function migrateUp(adapter: DatabaseAdapter): Promise<string[]> {
  const journal = loadJournal();
  const applied = await getAppliedRevisions(adapter);
  const pending = journal.revisions.filter((r) => !applied.includes(r));
  const appliedNow: string[] = [];

  for (const revision of pending) {
    const sqlPath = join(getMigrationsDir(), `${revision}.sql`);
    if (!existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${revision}.sql`);
    }
    const sql = readFileSync(sqlPath, "utf-8");

    await adapter.transaction(async () => {
      const statements = parseSqlStatements(sql);

      for (const statement of statements) {
        await adapter.exec(statement);
      }
      await adapter.exec(
        "INSERT INTO schema_migrations (id, revision) VALUES (?, ?)",
        [randomUUID(), revision]
      );
    });

    appliedNow.push(revision);
  }

  return appliedNow;
}

export async function getCurrentRevision(adapter: DatabaseAdapter): Promise<string | null> {
  const applied = await getAppliedRevisions(adapter);
  return applied.length > 0 ? applied[applied.length - 1] : null;
}

export function listMigrationFiles(): string[] {
  const dir = getMigrationsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(".sql", ""))
    .sort();
}
