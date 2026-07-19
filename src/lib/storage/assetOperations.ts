import "server-only";
import { prisma } from "@/lib/prisma";
import {
  LocalObjectStorage,
  privateAssetUrlToKey,
  selectObjectStorage,
  type PrivateObjectStorage,
} from "./objectStorage";
export type AssetMigrationReport = {
  dryRun: boolean;
  examined: number;
  migrated: number;
  skipped: number;
  missing: number;
  failed: number;
  items: { key: string; action: string; size?: number }[];
};
export async function migrateLocalAssets(options: {
  dryRun: boolean;
  sourceRoot?: string;
  source?: PrivateObjectStorage;
  target?: PrivateObjectStorage;
}): Promise<AssetMigrationReport> {
  const source = options.source ?? new LocalObjectStorage(options.sourceRoot);
  const target = options.target ?? selectObjectStorage();
  const objects = [
    ...(await source.list("job-photos")),
    ...(await source.list("company-logos")),
  ];
  const report: AssetMigrationReport = {
    dryRun: options.dryRun,
    examined: objects.length,
    migrated: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
    items: [],
  };
  for (const object of objects) {
    try {
      const existing = await target.metadata(object.key);
      if (existing?.size === object.size) {
        report.skipped++;
        report.items.push({
          key: object.key,
          action: "skipped",
          size: object.size,
        });
        continue;
      }
      if (options.dryRun) {
        report.migrated++;
        report.items.push({
          key: object.key,
          action: "would-migrate",
          size: object.size,
        });
        continue;
      }
      const value = await source.get(object.key);
      if (!value) {
        report.missing++;
        report.items.push({ key: object.key, action: "missing" });
        continue;
      }
      const written = await target.put(
        object.key,
        value.data,
        value.metadata.contentType ?? "application/octet-stream",
      );
      if (written.size !== value.data.length)
        throw new Error("Size verification failed.");
      report.migrated++;
      report.items.push({
        key: object.key,
        action: "migrated",
        size: written.size,
      });
    } catch {
      report.failed++;
      report.items.push({ key: object.key, action: "failed" });
    }
  }
  return report;
}
export type AssetBackupReport = {
  generatedAt: string;
  referenced: number;
  stored: number;
  missingReferences: string[];
  orphanedObjects: string[];
  sampled: number;
  sampleFailures: string[];
  healthy: boolean;
};
export async function reconcilePrivateAssets(
  storage: PrivateObjectStorage = selectObjectStorage(),
  sampleSize = 10,
): Promise<AssetBackupReport> {
  const [photos, companies, jobObjects, logoObjects] = await Promise.all([
    prisma.jobPhoto.findMany({ select: { fileUrl: true, thumbnailUrl: true } }),
    prisma.company.findMany({
      where: { logoUrl: { not: null } },
      select: { logoUrl: true },
    }),
    storage.list("job-photos"),
    storage.list("company-logos"),
  ]);
  const referenced = new Set(
    [
      ...photos.flatMap((x) =>
        [x.fileUrl, x.thumbnailUrl].filter((v): v is string => Boolean(v)),
      ),
      ...companies.flatMap((x) => (x.logoUrl ? [x.logoUrl] : [])),
    ].flatMap((url) => {
      const key = privateAssetUrlToKey(url);
      return key ? [key] : [];
    }),
  );
  const stored = new Map(
    [...jobObjects, ...logoObjects].map((x) => [x.key, x]),
  );
  const missingReferences = [...referenced].filter((key) => !stored.has(key));
  const orphanedObjects = [...stored.keys()].filter(
    (key) => !referenced.has(key),
  );
  const sampleFailures: string[] = [];
  const sample = [...referenced]
    .filter((key) => stored.has(key))
    .slice(0, Math.max(0, sampleSize));
  for (const key of sample) {
    try {
      const value = await storage.get(key);
      if (!value || value.data.length !== stored.get(key)!.size)
        sampleFailures.push(key);
    } catch {
      sampleFailures.push(key);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    referenced: referenced.size,
    stored: stored.size,
    missingReferences,
    orphanedObjects,
    sampled: sample.length,
    sampleFailures,
    healthy: !missingReferences.length && !sampleFailures.length,
  };
}
