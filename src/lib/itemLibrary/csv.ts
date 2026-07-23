import { STANDARD_ITEM_CATEGORIES, WEIGHT_CLASSES, type ItemLibraryInput } from "./types";

export const ITEM_CSV_HEADERS = [
  "category", "name", "description", "basePrice", "disposalFee", "laborHours",
  "weightClass", "estimatedVolume", "recyclable", "donationEligible", "hazardous",
  "refrigerant", "electronics", "mattress", "tire", "appliance",
  "constructionDebris", "yardWaste", "requiresTwoPeople", "requiresDisassembly",
  "requiresSpecialEquipment", "notes", "displayOrder",
] as const;

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export function exportItemLibraryCsv(rows: ItemLibraryInput[]) {
  return [ITEM_CSV_HEADERS.join(","), ...rows.map((row) => ITEM_CSV_HEADERS.map((key) => quote(row[key])).join(","))].join("\r\n");
}

function parseRows(csv: string) {
  const rows: string[][] = []; let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { value += '"'; index++; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index++;
      row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = "";
    } else value += char;
  }
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}
const boolean = (value: string) => ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
const number = (value: string) => value.trim() === "" ? 0 : Number(value);

export function previewItemLibraryCsv(csv: string, existing: Array<{ category: string; name: string }> = []) {
  const rows = parseRows(csv);
  if (!rows.length) return { items: [] as ItemLibraryInput[], errors: ["CSV is empty."] };
  const headers = rows[0].map((header) => header.trim());
  const missing = ["category", "name", "basePrice", "disposalFee", "laborHours"].filter((header) => !headers.includes(header));
  if (missing.length) return { items: [] as ItemLibraryInput[], errors: [`Missing required columns: ${missing.join(", ")}.`] };
  const seen = new Set(existing.map((item) => `${item.category}:${item.name}`.toLowerCase()));
  const items: ItemLibraryInput[] = [], errors: string[] = [];
  rows.slice(1).forEach((cells, rowIndex) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const key = `${record.category}:${record.name}`.toLowerCase();
    const values = [number(record.basePrice), number(record.disposalFee), number(record.laborHours), number(record.estimatedVolume)];
    if (!record.category.trim() || !record.name.trim()) errors.push(`Row ${rowIndex + 2}: category and name are required.`);
    else if (seen.has(key)) errors.push(`Row ${rowIndex + 2}: duplicate active item ${record.category} / ${record.name}.`);
    else if (values.some((item) => !Number.isFinite(item)) || values[0] < 0 || values[1] < 0 || values[2] <= 0 || values[3] < 0) errors.push(`Row ${rowIndex + 2}: pricing and labor values are invalid.`);
    else if (record.weightClass && !WEIGHT_CLASSES.includes(record.weightClass as never)) errors.push(`Row ${rowIndex + 2}: invalid weight class.`);
    else {
      seen.add(key);
      items.push({
        category: record.category.trim(), name: record.name.trim(), description: record.description || null,
        active: true, displayOrder: number(record.displayOrder), basePrice: values[0], disposalFee: values[1],
        laborHours: values[2], weightClass: (record.weightClass || "Medium") as ItemLibraryInput["weightClass"],
        estimatedVolume: values[3], recyclable: boolean(record.recyclable), donationEligible: boolean(record.donationEligible),
        hazardous: boolean(record.hazardous), refrigerant: boolean(record.refrigerant), electronics: boolean(record.electronics),
        mattress: boolean(record.mattress), tire: boolean(record.tire), appliance: boolean(record.appliance),
        constructionDebris: boolean(record.constructionDebris), yardWaste: boolean(record.yardWaste),
        requiresTwoPeople: boolean(record.requiresTwoPeople), requiresDisassembly: boolean(record.requiresDisassembly),
        requiresSpecialEquipment: boolean(record.requiresSpecialEquipment), notes: record.notes || null,
      });
    }
  });
  return { items, errors, standardCategories: STANDARD_ITEM_CATEGORIES };
}
