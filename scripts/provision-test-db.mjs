import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";

const targetDatabase = "junkquote_pro_test";
const developmentValue = process.env.DATABASE_URL;
if (!developmentValue) throw new Error("DATABASE_URL is required to provision the dedicated test database.");
const developmentUrl = new URL(developmentValue);
const developmentDatabase = decodeURIComponent(developmentUrl.pathname.slice(1)).toLowerCase();
if (!developmentDatabase || developmentDatabase.includes("test") || developmentDatabase === targetDatabase) throw new Error("Refusing to provision from a test or ambiguous source database.");

const client = new pg.Client({ connectionString: developmentValue });
await client.connect();
try {
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDatabase]);
  if (!existing.rowCount) await client.query(`CREATE DATABASE "${targetDatabase}"`);
} finally {
  await client.end();
}

const testUrl = new URL(developmentValue);
testUrl.pathname = `/${targetDatabase}`;
const testValue = testUrl.toString();
if (testValue === developmentValue) throw new Error("Provisioned test URL unexpectedly equals development URL.");
const envPath = new URL("../.env", import.meta.url);
const source = await readFile(envPath, "utf8");
const line = `DATABASE_URL_TEST=${testValue}`;
const next = /^DATABASE_URL_TEST=.*$/m.test(source) ? source.replace(/^DATABASE_URL_TEST=.*$/m, line) : `${source.trimEnd()}\n${line}\n`;
await writeFile(envPath, next, "utf8");
console.log(`Dedicated test database ready: ${targetDatabase}`);
