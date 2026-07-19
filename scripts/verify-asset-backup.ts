import { reconcilePrivateAssets } from "../src/lib/storage/assetOperations";
async function main() {
const report = await reconcilePrivateAssets(
  undefined,
  Number(process.env.ASSET_VERIFY_SAMPLE_SIZE ?? 10),
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.healthy) process.exitCode = 1;
}
void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Asset verification failed."}\n`);
  process.exitCode = 1;
});
