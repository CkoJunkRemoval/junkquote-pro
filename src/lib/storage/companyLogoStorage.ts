import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.resolve(process.env.PRIVATE_ASSET_STORAGE_ROOT ?? path.join(process.cwd(), ".data", "private-assets"), "company-logos");
const prefix = "/api/private/assets/company-logos";

function safeCompanyId(companyId: string) { if (!/^[a-zA-Z0-9_-]+$/.test(companyId)) throw new Error("Invalid company ID."); return companyId; }
export function buildCompanyLogoStoragePrefix(companyId: string) { return `${prefix}/${safeCompanyId(companyId)}/`; }
function resolveLogoPath(fileUrl: string) { if (!fileUrl.startsWith(`${prefix}/`) || fileUrl.includes("..") || fileUrl.includes("\\")) return null; const relative = fileUrl.slice(`${prefix}/`.length); if (relative.split("/").length !== 2) return null; const target = path.resolve(root, relative); return target.startsWith(`${root}${path.sep}`) ? target : null; }

export const allowedLogoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
export const maxLogoFileSize = 2 * 1024 * 1024;

export function validateLogoFile(file: File) {
  if (!allowedLogoMimeTypes.includes(file.type)) throw new Error("Logo must be a JPEG, PNG, or WebP image.");
  if (!file.size || file.size > maxLogoFileSize) throw new Error("Logo must be no larger than 2 MB.");
}

export const localCompanyLogoStorage = {
  async save(companyId: string, file: File) {
    validateLogoFile(file);
    const directory = path.join(root, safeCompanyId(companyId));
    await mkdir(directory, { recursive: true });
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const)[file.type];
    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, fileName), Buffer.from(await file.arrayBuffer()));
    return `${buildCompanyLogoStoragePrefix(companyId)}${fileName}`;
  },
  async remove(companyId: string, fileUrl: string | null | undefined) {
    if (!fileUrl?.startsWith(buildCompanyLogoStoragePrefix(companyId))) return;
    const target = resolveLogoPath(fileUrl); if (!target) return;
    try { await unlink(target); } catch { /* absent files are already safe */ }
  },
  async readDataUrl(fileUrl: string | null | undefined) {
    if (!fileUrl) return null; const target = resolveLogoPath(fileUrl); if (!target) return null;
    const extension = path.extname(target).toLowerCase();
    const mimeType = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" } as Record<string, string | undefined>)[extension];
    if (!mimeType) return null;
    try { const data = await readFile(target); return `data:${mimeType};base64,${data.toString("base64")}`; } catch { return null; }
  },
};
