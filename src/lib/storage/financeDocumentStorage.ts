import { randomUUID } from "node:crypto";
import { safeObjectKey, selectObjectStorage } from "./objectStorage";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function financeDocumentKey(
  companyId: string,
  documentId: string,
  fileName: string,
) {
  return safeObjectKey("finance-documents", companyId, documentId, fileName);
}

export async function saveFinanceDocument(
  companyId: string,
  documentId: string,
  file: File,
) {
  if (!allowedTypes.has(file.type))
    throw new Error("Receipts must be a PDF, JPEG, PNG, or WebP file.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new Error("Finance documents must be between 1 byte and 10 MB.");
  const storageKey = financeDocumentKey(
    companyId,
    documentId,
    `${randomUUID()}.${extensions[file.type]}`,
  );
  const result = await selectObjectStorage().put(
    storageKey,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  return { storageKey, sizeBytes: result.size };
}

export async function readFinanceDocument(storageKey: string) {
  return selectObjectStorage().get(storageKey);
}
