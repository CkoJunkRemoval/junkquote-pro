export const allowedLogoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const maxLogoFileSize = 2 * 1024 * 1024;

export function validateLogoFile(file: Pick<File, "type" | "size">) {
  if (!allowedLogoMimeTypes.includes(file.type as (typeof allowedLogoMimeTypes)[number])) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (!file.size || file.size > maxLogoFileSize) {
    throw new Error("Choose an image no larger than 2 MB.");
  }
}

export function createLogoPreview(
  file: File,
  createObjectUrl: (file: File) => string,
) {
  validateLogoFile(file);
  return createObjectUrl(file);
}
