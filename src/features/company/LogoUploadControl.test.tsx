import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createLogoPreview,
  maxLogoFileSize,
  validateLogoFile,
} from "@/lib/company/logoFileValidation";
import LogoUploadControl, {
  nextRemoveConfirmationState,
  openLogoFilePicker,
} from "./LogoUploadControl";

const baseProps = {
  companyName: "Junk Team",
  currentLogoUrl: null,
  selectedFile: null,
  previewUrl: null,
  busy: false,
  onFileChange: vi.fn(),
  onSave: vi.fn(),
  onRemove: vi.fn(async () => true),
};

describe("logo upload control", () => {
  it("opens the real file input from the choose-logo button", () => {
    const click = vi.fn();
    openLogoFilePicker({ click });
    expect(click).toHaveBeenCalledOnce();

    const html = renderToStaticMarkup(<LogoUploadControl {...baseProps} />);
    expect(html).toContain('type="file"');
    expect(html).toContain('aria-label="Choose company logo"');
  });

  it("shows the selected file name", () => {
    const file = new File(["logo"], "team-logo.png", { type: "image/png" });
    const html = renderToStaticMarkup(
      <LogoUploadControl {...baseProps} selectedFile={file} />,
    );
    expect(html).toContain("team-logo.png");
    expect(html).toContain("Save logo");
  });

  it("shows a valid local object URL preview", () => {
    const file = new File(["logo"], "team-logo.webp", {
      type: "image/webp",
    });
    const preview = createLogoPreview(file, () => "blob:local-logo");
    const html = renderToStaticMarkup(
      <LogoUploadControl
        {...baseProps}
        selectedFile={file}
        previewUrl={preview}
      />,
    );
    expect(html).toContain('src="blob:local-logo"');
    expect(html).toContain("Selected logo preview for Junk Team");
  });

  it("rejects unsupported file types before upload", () => {
    expect(() =>
      validateLogoFile({ type: "image/gif", size: 100 }),
    ).toThrow("JPEG, PNG, or WebP");
  });

  it("rejects files over 2 MB before upload", () => {
    expect(() =>
      validateLogoFile({
        type: "image/png",
        size: maxLogoFileSize + 1,
      }),
    ).toThrow("no larger than 2 MB");
  });

  it("requires and clears an explicit remove confirmation", () => {
    expect(nextRemoveConfirmationState(false, "request")).toBe(true);
    expect(nextRemoveConfirmationState(true, "cancel")).toBe(false);
    expect(nextRemoveConfirmationState(true, "removed")).toBe(false);
  });

  it("uses a stacked, overflow-safe mobile layout and 44px actions", () => {
    const html = renderToStaticMarkup(<LogoUploadControl {...baseProps} />);
    expect(html).toContain("flex min-w-0 flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("min-h-11 w-full");
  });

  it("uses native keyboard-accessible buttons with visible focus styles", () => {
    const html = renderToStaticMarkup(<LogoUploadControl {...baseProps} />);
    expect(html).toContain('type="button"');
    expect(html).toContain("focus-visible:");
    expect(html).toContain('class="sr-only"');
  });
});
