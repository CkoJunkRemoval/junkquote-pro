import { randomUUID } from "node:crypto";
import { safeObjectKey, selectObjectStorage } from "./objectStorage";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);
const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
};

export function workforceDocumentKey(companyId: string, employeeId: string, fileName: string) {
  return safeObjectKey("workforce-documents", companyId, employeeId, fileName);
}

export async function saveWorkforceDocument(
  companyId: string,
  employeeId: string,
  file: File,
) {
  if (!allowedTypes.has(file.type)) throw new Error("Unsupported workforce document type.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new Error("Workforce documents must be between 1 byte and 10 MB.");
  const storageKey = workforceDocumentKey(
    companyId,
    employeeId,
    `${randomUUID()}.${extensions[file.type]}`,
  );
  const result = await selectObjectStorage().put(
    storageKey,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  return { storageKey, sizeBytes: result.size };
}

export async function readWorkforceDocument(storageKey: string) {
  return selectObjectStorage().get(storageKey);
}

