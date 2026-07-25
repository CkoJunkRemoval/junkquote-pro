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

export function assetDocumentKey(
  companyId: string,
  assetId: string,
  fileName: string,
) {
  return safeObjectKey("asset-documents", companyId, assetId, fileName);
}

export async function saveAssetDocument(
  companyId: string,
  assetId: string,
  file: File,
) {
  if (!allowedTypes.has(file.type))
    throw new Error("Unsupported asset document type.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new Error("Asset documents must be between 1 byte and 10 MB.");
  const storageKey = assetDocumentKey(
    companyId,
    assetId,
    `${randomUUID()}.${extensions[file.type]}`,
  );
  const result = await selectObjectStorage().put(
    storageKey,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  return { storageKey, sizeBytes: result.size };
}

export async function readAssetDocument(storageKey: string) {
  return selectObjectStorage().get(storageKey);
}
