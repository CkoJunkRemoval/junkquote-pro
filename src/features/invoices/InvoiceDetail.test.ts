import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/features/invoices/InvoiceDetail.tsx"),
  "utf8",
);

describe("invoice email review UI", () => {
  it("provides editable recipient, subject, and message fields with send state", () => {
    expect(source).toContain('type="email"');
    expect(source).toContain("setEmailSubject");
    expect(source).toContain("setEmailMessage");
    expect(source).toContain("Sending...");
    expect(source).toContain("Resend Invoice");
    expect(source).toContain("Delivery failed:");
    expect(source).not.toContain("Scheduled");
  });

  it("explains a missing saved customer email and reports success and errors", () => {
    expect(source).toContain("does not have an email address on file");
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
  });
});
