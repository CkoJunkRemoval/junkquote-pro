import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error(
    "Usage: node scripts/import-zip-centroids.mjs <gazetteer.txt> <output.json>",
  );
}

const rows = (await readFile(inputPath, "utf8"))
  .split(/\r?\n/)
  .slice(1)
  .flatMap((line) => {
    const [zip, , , , , latitude, longitude] = line.trim().split(/\s+/);
    if (!/^\d{5}$/.test(zip)) return [];
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [[zip, lat, lon]];
  });

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source: "U.S. Census Bureau 2024 ZCTA Gazetteer",
      version: "2024",
      rows,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${rows.length} ZIP centroid rows to ${outputPath}.`);
