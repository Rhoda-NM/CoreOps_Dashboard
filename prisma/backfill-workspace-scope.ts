import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

// Retain the standalone backfill entry point. Raw SQL intentionally works both
// before and after workspaceId becomes required in the generated Prisma types.
// The shared migration checks conflicting ownership before any null-only repair.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const sql = await readFile("prisma/migrations/20261105000100_backfill_verified_workspace_scope/migration.sql", "utf8");
    await client.query(sql);
    console.log("Workspace ownership verified and null-only backfill completed.");
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error("Workspace backfill failed. Review conflicting ownership and migration prerequisites; no default tenant was assigned.");
  process.exitCode = 1;
});
