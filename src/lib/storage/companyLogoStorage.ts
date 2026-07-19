import { randomUUID } from "node:crypto";
import { selectObjectStorage, safeObjectKey } from "./objectStorage";
const prefix = "/api/private/assets/company-logos";
export const allowedLogoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
export const maxLogoFileSize = 2 * 1024 * 1024;
export function buildCompanyLogoStoragePrefix(companyId: string) {
  try {
    safeObjectKey(companyId);
  } catch {
    throw new Error("Invalid company ID.");
  }
  return `${prefix}/${companyId}/`;
}
function keyFromUrl(fileUrl: string) {
  if (
    !fileUrl.startsWith(`${prefix}/`) ||
    fileUrl.includes("..") ||
    fileUrl.includes("\\")
  )
    return null;
  const parts = fileUrl.slice(`${prefix}/`.length).split("/");
  if (parts.length !== 2) return null;
  return safeObjectKey("company-logos", ...parts);
}
export function validateLogoFile(file: File) {
  if (!allowedLogoMimeTypes.includes(file.type))
    throw new Error("Logo must be a JPEG, PNG, or WebP image.");
  if (!file.size || file.size > maxLogoFileSize)
    throw new Error("Logo must be no larger than 2 MB.");
}
export const localCompanyLogoStorage = {
  async save(companyId: string, file: File) {
    validateLogoFile(file);
    const extension = (
      { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const
    )[file.type];
    const fileName = `${randomUUID()}.${extension}`;
    await selectObjectStorage().put(
      safeObjectKey("company-logos", companyId, fileName),
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    return `${buildCompanyLogoStoragePrefix(companyId)}${fileName}`;
  },
  async remove(companyId: string, fileUrl: string | null | undefined) {
    if (!fileUrl?.startsWith(buildCompanyLogoStoragePrefix(companyId))) return;
    const key = keyFromUrl(fileUrl);
    if (key) await selectObjectStorage().delete(key);
  },
  async readDataUrl(fileUrl: string | null | undefined) {
    if (!fileUrl) return null;
    const key = keyFromUrl(fileUrl);
    if (!key) return null;
    const object = await selectObjectStorage().get(key);
    if (!object) return null;
    return `data:${object.metadata.contentType ?? "application/octet-stream"};base64,${object.data.toString("base64")}`;
  },
};
