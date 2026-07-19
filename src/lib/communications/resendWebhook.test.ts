import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseResendDeliveryEvent, verifyResendWebhook } from "./resendWebhook";
const secret = "whsec_" + Buffer.from("test-secret").toString("base64");
describe("Resend webhook security", () => {
  it("verifies signature and timestamp", () => {
    const body = '{"type":"email.delivered"}';
    const timestamp = "1700000000";
    const signature = createHmac("sha256", Buffer.from("test-secret"))
      .update(`event-1.${timestamp}.${body}`)
      .digest("base64");
    expect(
      verifyResendWebhook(
        body,
        { id: "event-1", timestamp, signature: `v1,${signature}` },
        secret,
        1700000000_000,
      ),
    ).toBe("event-1");
  });
  it("rejects invalid and stale events", () => {
    expect(() =>
      verifyResendWebhook(
        "{}",
        { id: "event-1", timestamp: "1", signature: "v1,bad" },
        secret,
        Date.now(),
      ),
    ).toThrow();
  });
  it("parses only bounded delivery fields", () =>
    expect(
      parseResendDeliveryEvent(
        JSON.stringify({
          type: "email.bounced",
          created_at: "2026-07-23T00:00:00Z",
          data: { email_id: "email-1", companyId: "untrusted" },
        }),
      ),
    ).toMatchObject({
      eventType: "email.bounced",
      providerMessageId: "email-1",
    }));
});
