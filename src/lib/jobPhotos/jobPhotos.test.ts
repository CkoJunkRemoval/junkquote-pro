import { describe, expect, it, vi } from "vitest";
vi.mock("../prisma", () => ({ prisma: {} }));
import { maxJobPhotoSize, validateJobPhotoFile } from "./jobPhotos";

describe("job photo validation", () => {
  it("accepts supported image metadata", () => expect(() => validateJobPhotoFile({ type: "image/jpeg", size: 100, name: "photo.jpg" } as File)).not.toThrow());
  it("rejects unsupported files and oversized uploads", () => {
    expect(() => validateJobPhotoFile({ type: "application/pdf", size: 100, name: "file.pdf" } as File)).toThrow("Only JPEG");
    expect(() => validateJobPhotoFile({ type: "image/jpeg", size: maxJobPhotoSize + 1, name: "large.jpg" } as File)).toThrow("10 MB");
  });
  it("rejects disguised extensions even with an allowed MIME type",()=>expect(()=>validateJobPhotoFile({type:"image/jpeg",size:100,name:"malware.exe"} as File)).toThrow("does not match"));
});
