import { cpSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "src", "migrations");
const dest = join(__dirname, "..", "dist", "migrations");

if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
cpSync(join(src, "sql"), join(dest, "sql"), { recursive: true });
cpSync(join(src, "meta"), join(dest, "meta"), { recursive: true });
console.log("Migrations copied to dist/");
