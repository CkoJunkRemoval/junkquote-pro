import { randomUUID } from "node:crypto";
import { selectObjectStorage, safeObjectKey } from "./objectStorage";
const urlPrefix = "/api/private/assets/job-photos";
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
const allowed = new Set(Object.keys(extensions));
export function buildJobPhotoStoragePrefix(companyId: string, jobId: string) {
  try {
    safeObjectKey(companyId);
  } catch {
    throw new Error("Invalid company ID.");
  }
  try {
    safeObjectKey(jobId);
  } catch {
    throw new Error("Invalid job ID.");
  }
  return `${urlPrefix}/${companyId}/${jobId}/`;
}
function keyFromUrl(fileUrl: string) {
  if (
    !fileUrl.startsWith(`${urlPrefix}/`) ||
    fileUrl.includes("\\") ||
    fileUrl.includes("..")
  )
    return null;
  const parts = fileUrl.slice(`${urlPrefix}/`.length).split("/");
  if (parts.length !== 3) return null;
  return safeObjectKey("job-photos", ...parts);
}
export function sanitizeJobPhotoFilename(name: string) {
  return (
    name
      .replaceAll("\\", "/")
      .split("/")
      .pop()!
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .trim()
      .slice(0, 180) || "photo"
  );
}
export interface JobPhotoStorage {
  save(
    companyId: string,
    jobId: string,
    file: File,
  ): Promise<{ fileUrl: string; thumbnailUrl: string | null }>;
  remove(companyId: string, jobId: string, fileUrl: string): Promise<void>;
  readDataUrl(fileUrl: string): Promise<string | null>;
}
export const localJobPhotoStorage: JobPhotoStorage = {
  async save(companyId, jobId, file) {
    if (!allowed.has(file.type)) throw new Error("Unsupported image type.");
    const extension = extensions[file.type];
    const fileName = `${randomUUID()}.${extension}`;
    const key = safeObjectKey("job-photos", companyId, jobId, fileName);
    await selectObjectStorage().put(
      key,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    const fileUrl = `${buildJobPhotoStoragePrefix(companyId, jobId)}${fileName}`;
    return { fileUrl, thumbnailUrl: fileUrl };
  },
  async remove(companyId, jobId, fileUrl) {
    if (!fileUrl.startsWith(buildJobPhotoStoragePrefix(companyId, jobId)))
      return;
    const key = keyFromUrl(fileUrl);
    if (key) await selectObjectStorage().delete(key);
  },
  async readDataUrl(fileUrl) {
    const key = keyFromUrl(fileUrl);
    if (!key) return null;
    const object = await selectObjectStorage().get(key);
    if (!object) return null;
    const type = object.metadata.contentType ?? "application/octet-stream";
    return `data:${type};base64,${object.data.toString("base64")}`;
  },
};
