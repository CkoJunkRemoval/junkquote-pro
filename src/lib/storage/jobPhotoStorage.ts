import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.join(process.cwd(), "public", "uploads", "job-photos");

export interface JobPhotoStorage {
  save(file: File): Promise<{ fileUrl: string; thumbnailUrl: string | null }>;
  remove(fileUrl: string): Promise<void>;
  readDataUrl(fileUrl: string): Promise<string | null>;
}

export const localJobPhotoStorage: JobPhotoStorage = {
  async save(file) { await mkdir(root, { recursive: true }); const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg"; const name = `${randomUUID()}.${extension}`; await writeFile(path.join(root, name), Buffer.from(await file.arrayBuffer())); const fileUrl = `/uploads/job-photos/${name}`; return { fileUrl, thumbnailUrl: fileUrl }; },
  async remove(fileUrl) { if (!fileUrl.startsWith("/uploads/job-photos/")) return; try { await unlink(path.join(root, path.basename(fileUrl))); } catch { /* already removed */ } },
  async readDataUrl(fileUrl) { if (!fileUrl.startsWith("/uploads/job-photos/")) return null; try { const data = await readFile(path.join(root, path.basename(fileUrl))); return `data:image/jpeg;base64,${data.toString("base64")}`; } catch { return null; } },
};
