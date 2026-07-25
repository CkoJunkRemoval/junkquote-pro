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

export async function saveCompanyDocument(
  companyId: string,
  documentId: string,
  file: File,
) {
  if (!allowedTypes.has(file.type))
    throw new Error("Company documents must be PDF, image, or text files.");
  if (file.size <= 0 || file.size > 20 * 1024 * 1024)
    throw new Error("Company documents must be between 1 byte and 20 MB.");
  const objectKey = safeObjectKey(
    "company-documents",
    companyId,
    documentId,
    `${randomUUID()}.${extensions[file.type]}`,
  );
  const saved = await selectObjectStorage().put(
    objectKey,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  return { objectKey, sizeBytes: saved.size };
}

export function readCompanyDocument(objectKey: string) {
  return selectObjectStorage().get(objectKey);
}

export function removeCompanyDocument(objectKey: string) {
  return selectObjectStorage().delete(objectKey);
}
