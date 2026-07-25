import { randomUUID } from "node:crypto";
import { safeObjectKey, selectObjectStorage } from "./objectStorage";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const extensions: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export function taxDocumentKey(companyId: string, documentId: string, fileName: string) {
  return safeObjectKey("tax-documents", companyId, documentId, fileName);
}

export async function saveTaxDocument(companyId: string, documentId: string, file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Tax documents must be PDF, JPEG, PNG, or WebP.");
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error("Tax documents must be between 1 byte and 20 MB.");
  const storageKey = taxDocumentKey(companyId, documentId, `${randomUUID()}.${extensions[file.type]}`);
  const result = await selectObjectStorage().put(storageKey, Buffer.from(await file.arrayBuffer()), file.type);
  return { storageKey, sizeBytes: result.size };
}

export async function readTaxDocument(storageKey: string) {
  return selectObjectStorage().get(storageKey);
}
