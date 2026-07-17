import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.join(process.cwd(), "public", "uploads", "company-logos");
const prefix = "/uploads/company-logos/";

export const allowedLogoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
export const maxLogoFileSize = 2 * 1024 * 1024;

export function validateLogoFile(file: File) {
  if (!allowedLogoMimeTypes.includes(file.type)) throw new Error("Logo must be a JPEG, PNG, or WebP image.");
  if (!file.size || file.size > maxLogoFileSize) throw new Error("Logo must be no larger than 2 MB.");
}

export const localCompanyLogoStorage = {
  async save(file: File) {
    validateLogoFile(file);
    await mkdir(root, { recursive: true });
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const)[file.type];
    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(path.join(root, fileName), Buffer.from(await file.arrayBuffer()));
    return `${prefix}${fileName}`;
  },
  async remove(fileUrl: string | null | undefined) {
    if (!fileUrl?.startsWith(prefix)) return;
    try { await unlink(path.join(root, path.basename(fileUrl))); } catch { /* absent files are already safe */ }
  },
  async readDataUrl(fileUrl: string | null | undefined) {
    if (!fileUrl?.startsWith(prefix)) return null;
    const extension = path.extname(path.basename(fileUrl)).toLowerCase();
    const mimeType = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" } as Record<string, string | undefined>)[extension];
    if (!mimeType) return null;
    try { const data = await readFile(path.join(root, path.basename(fileUrl))); return `data:${mimeType};base64,${data.toString("base64")}`; } catch { return null; }
  },
};
