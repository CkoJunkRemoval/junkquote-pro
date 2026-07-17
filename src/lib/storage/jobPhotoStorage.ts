import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.resolve(process.cwd(), ".data", "private-assets", "job-photos");
const urlPrefix = "/api/private/assets/job-photos";
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

function safeSegment(value: string, label: string) { if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error(`Invalid ${label}.`); return value; }
export function buildJobPhotoStoragePrefix(companyId: string, jobId: string) { return `${urlPrefix}/${safeSegment(companyId, "company ID")}/${safeSegment(jobId, "job ID")}/`; }
function resolveStoredPath(fileUrl: string) {
  if (!fileUrl.startsWith(`${urlPrefix}/`) || fileUrl.includes("\\") || fileUrl.includes("..")) return null;
  const relative = fileUrl.slice(`${urlPrefix}/`.length);
  if (relative.split("/").length !== 3) return null;
  const target = path.resolve(root, relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export function sanitizeJobPhotoFilename(name: string) { const base = path.basename(name.replaceAll("\\", "/")).replace(/[^a-zA-Z0-9._ -]/g, "_").trim(); return base.slice(0, 180) || "photo"; }

export interface JobPhotoStorage {
  save(companyId: string, jobId: string, file: File): Promise<{ fileUrl: string; thumbnailUrl: string | null }>;
  remove(companyId: string, jobId: string, fileUrl: string): Promise<void>;
  readDataUrl(fileUrl: string): Promise<string | null>;
}

export const localJobPhotoStorage: JobPhotoStorage = {
  async save(companyId, jobId, file) { const prefix = buildJobPhotoStoragePrefix(companyId, jobId); const extension = extensions[file.type]; if (!extension) throw new Error("Unsupported image type."); const directory = path.join(root, safeSegment(companyId, "company ID"), safeSegment(jobId, "job ID")); await mkdir(directory, { recursive: true }); const name = `${randomUUID()}.${extension}`; await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer())); const fileUrl = `${prefix}${name}`; return { fileUrl, thumbnailUrl: fileUrl }; },
  async remove(companyId, jobId, fileUrl) { if (!fileUrl.startsWith(buildJobPhotoStoragePrefix(companyId, jobId))) return; const target = resolveStoredPath(fileUrl); if (!target) return; try { await unlink(target); } catch { /* already removed */ } },
  async readDataUrl(fileUrl) { const target = resolveStoredPath(fileUrl); if (!target) return null; const extension = path.extname(target).toLowerCase(); const mimeType = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" } as Record<string, string | undefined>)[extension]; if (!mimeType) return null; try { const data = await readFile(target); return `data:${mimeType};base64,${data.toString("base64")}`; } catch { return null; } },
};
