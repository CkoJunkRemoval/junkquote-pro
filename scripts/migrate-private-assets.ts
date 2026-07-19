import { migrateLocalAssets } from "../src/lib/storage/assetOperations";
async function main() {
const dryRun = !process.argv.includes("--execute");
const report = await migrateLocalAssets({
  dryRun,
  sourceRoot: process.env.LOCAL_ASSET_MIGRATION_ROOT,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.failed) process.exitCode = 1;
}
void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Asset migration failed."}\n`);
  process.exitCode = 1;
});
