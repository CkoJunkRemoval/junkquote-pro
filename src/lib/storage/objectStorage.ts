import {
  mkdir,
  readFile,
  unlink,
  writeFile,
  stat,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors/appError";
export type ObjectMetadata = {
  key: string;
  size: number;
  contentType: string | null;
  etag: string | null;
};
export interface PrivateObjectStorage {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<ObjectMetadata>;
  get(key: string): Promise<{ data: Buffer; metadata: ObjectMetadata } | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
  metadata(key: string): Promise<ObjectMetadata | null>;
  list(prefix: string): Promise<ObjectMetadata[]>;
}
const segment = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export function safeObjectKey(...parts: string[]) {
  if (
    !parts.length ||
    parts.some((part) => !segment.test(part) || part === "." || part === "..")
  )
    throw new AppError("STORAGE_FAILED", "Invalid private object key.");
  return parts.join("/");
}
export function privateAssetUrlToKey(url: string) {
  if (url.includes("..") || url.includes("\\")) return null;
  for (const prefix of [
    "/api/private/assets/job-photos/",
    "/api/private/assets/company-logos/",
  ]) {
    if (!url.startsWith(prefix)) continue;
    const kind = prefix.includes("job-photos") ? "job-photos" : "company-logos";
    const parts = url.slice(prefix.length).split("/");
    if (parts.length !== (kind === "job-photos" ? 3 : 2)) return null;
    try {
      return safeObjectKey(kind, ...parts);
    } catch {
      return null;
    }
  }
  return null;
}
const contentTypeFrom = (key: string) =>
  ({
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  })[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
export class LocalObjectStorage implements PrivateObjectStorage {
  readonly name = "local";
  constructor(
    private readonly root = path.resolve(
      process.env.PRIVATE_ASSET_STORAGE_ROOT ??
        path.join(process.cwd(), ".data", "private-assets"),
    ),
  ) {}
  private target(key: string) {
    const safe = safeObjectKey(...key.split("/"));
    const target = path.resolve(this.root, safe);
    if (!target.startsWith(`${this.root}${path.sep}`))
      throw new AppError("STORAGE_FAILED", "Invalid private object key.");
    return target;
  }
  async put(key: string, data: Buffer, contentType: string) {
    const target = this.target(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    return { key, size: data.length, contentType, etag: null };
  }
  async get(key: string) {
    const metadata = await this.metadata(key);
    if (!metadata) return null;
    return { data: await readFile(this.target(key)), metadata };
  }
  async exists(key: string) {
    return Boolean(await this.metadata(key));
  }
  async delete(key: string) {
    try {
      await unlink(this.target(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  async healthCheck() {
    try {
      await mkdir(this.root, { recursive: true });
      await stat(this.root);
      return true;
    } catch {
      return false;
    }
  }
  async metadata(key: string) {
    try {
      const info = await stat(this.target(key));
      return {
        key,
        size: info.size,
        contentType: contentTypeFrom(key),
        etag: null,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async list(prefix: string) {
    const safePrefix = prefix
      ? safeObjectKey(...prefix.replace(/\/$/, "").split("/"))
      : "";
    const base = safePrefix ? this.target(safePrefix) : this.root;
    const rows: ObjectMetadata[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true }).catch(
        () => [],
      )) {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(target);
        else {
          const key = path
            .relative(this.root, target)
            .split(path.sep)
            .join("/");
          const meta = await this.metadata(key);
          if (meta) rows.push(meta);
        }
      }
    };
    await walk(base);
    return rows;
  }
}
export class SupabaseObjectStorage implements PrivateObjectStorage {
  readonly name = "supabase";
  constructor(
    private readonly baseUrl: string,
    private readonly serviceKey: string,
    private readonly bucket: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  private objectUrl(key: string) {
    safeObjectKey(...key.split("/"));
    return `${this.baseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(this.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  private headers(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
      ...extra,
    };
  }
  async put(key: string, data: Buffer, contentType: string) {
    const response = await this.fetcher(this.objectUrl(key), {
      method: "POST",
      headers: this.headers({
        "Content-Type": contentType,
        "x-upsert": "true",
      }),
      body: new Uint8Array(data),
    });
    if (!response.ok)
      throw new AppError("STORAGE_FAILED", "Private object upload failed.", {
        providerStatus: response.status,
      });
    const result = await this.metadata(key);
    if (!result || result.size !== data.length)
      throw new AppError(
        "STORAGE_FAILED",
        "Private object verification failed.",
      );
    return result;
  }
  async get(key: string) {
    const response = await this.fetcher(this.objectUrl(key), {
      headers: this.headers(),
    });
    if (response.status === 404) return null;
    if (!response.ok)
      throw new AppError("STORAGE_FAILED", "Private object download failed.", {
        providerStatus: response.status,
      });
    const data = Buffer.from(await response.arrayBuffer());
    return {
      data,
      metadata: {
        key,
        size: data.length,
        contentType: response.headers.get("content-type"),
        etag: response.headers.get("etag"),
      },
    };
  }
  async exists(key: string) {
    return Boolean(await this.metadata(key));
  }
  async delete(key: string) {
    const response = await this.fetcher(this.objectUrl(key), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!response.ok && response.status !== 404)
      throw new AppError("STORAGE_FAILED", "Private object deletion failed.", {
        providerStatus: response.status,
      });
  }
  async healthCheck() {
    const response = await this.fetcher(
      `${this.baseUrl.replace(/\/$/, "")}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`,
      { headers: this.headers() },
    );
    return response.ok;
  }
  async metadata(key: string) {
    const response = await this.fetcher(this.objectUrl(key), {
      method: "HEAD",
      headers: this.headers(),
    });
    if (response.status === 404) return null;
    if (!response.ok)
      throw new AppError("STORAGE_FAILED", "Private object metadata failed.", {
        providerStatus: response.status,
      });
    return {
      key,
      size: Number(response.headers.get("content-length") ?? 0),
      contentType: response.headers.get("content-type"),
      etag: response.headers.get("etag"),
    };
  }
  async list(prefix: string) {
    const response = await this.fetcher(
      `${this.baseUrl.replace(/\/$/, "")}/storage/v1/object/list/${encodeURIComponent(this.bucket)}`,
      {
        method: "POST",
        headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          prefix,
          limit: 1000,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        }),
      },
    );
    if (!response.ok)
      throw new AppError("STORAGE_FAILED", "Private object listing failed.", {
        providerStatus: response.status,
      });
    const values = (await response.json()) as Array<{
      name: string;
      metadata?: { size?: number; mimetype?: string; eTag?: string };
    }>;
    return values.map((value) => ({
      key: `${prefix.replace(/\/$/, "")}/${value.name}`.replace(/^\//, ""),
      size: value.metadata?.size ?? 0,
      contentType: value.metadata?.mimetype ?? null,
      etag: value.metadata?.eTag ?? null,
    }));
  }
}
export function selectObjectStorage(
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): PrivateObjectStorage {
  const driver = env.PRIVATE_ASSET_STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    if (env.NODE_ENV === "production")
      throw new AppError(
        "STORAGE_FAILED",
        "Local private storage is disabled in production.",
      );
    return new LocalObjectStorage(env.PRIVATE_ASSET_STORAGE_ROOT);
  }
  if (driver === "supabase") {
    if (
      !env.SUPABASE_STORAGE_URL ||
      !env.SUPABASE_SERVICE_ROLE_KEY ||
      !env.SUPABASE_STORAGE_BUCKET
    )
      throw new AppError(
        "STORAGE_FAILED",
        "Supabase private storage configuration is incomplete.",
      );
    return new SupabaseObjectStorage(
      env.SUPABASE_STORAGE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      env.SUPABASE_STORAGE_BUCKET,
      fetcher,
    );
  }
  throw new AppError("STORAGE_FAILED", "Unsupported private storage provider.");
}
