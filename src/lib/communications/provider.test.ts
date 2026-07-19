import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/appError";
import { ResendEmailProvider, selectCommunicationProvider } from "./provider";
describe("email provider", () => {
  it("keeps console in development and selects Resend in production", () => {
    expect(selectCommunicationProvider({ NODE_ENV: "development" }).name).toBe(
      "console",
    );
    expect(
      selectCommunicationProvider(
        {
          NODE_ENV: "production",
          EMAIL_PROVIDER: "resend",
          RESEND_API_KEY: "key",
          EMAIL_FROM: "from@example.com",
        },
        vi.fn() as never,
      ).name,
    ).toBe("resend");
  });
  it("rejects console and incomplete credentials in production", () => {
    expect(() =>
      selectCommunicationProvider({
        NODE_ENV: "production",
        EMAIL_PROVIDER: "console",
      }),
    ).toThrow(AppError);
    expect(() =>
      selectCommunicationProvider({
        NODE_ENV: "production",
        EMAIL_PROVIDER: "resend",
      }),
    ).toThrow("incomplete");
  });
  it("sends request and maps provider rejection safely", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "secret provider body" }), {
          status: 422,
        }),
      );
    const provider = new ResendEmailProvider(
      "secret",
      "from@example.com",
      fetcher,
    );
    await expect(
      provider.send(
        {
          channel: "email",
          to: "to@example.com",
          subject: "Hi",
          body: "Private body",
        },
        {
          idempotencyKey: "key-1",
          requestId: "request-123",
          communicationId: "comm-1",
        },
      ),
    ).resolves.toEqual({ providerMessageId: "email-1" });
    await expect(
      provider.send(
        { channel: "email", to: "to@example.com", body: "Private body" },
        { idempotencyKey: "key-2" },
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(JSON.stringify(fetcher.mock.calls)).toContain(
      "X-JunkQuote-Request-ID",
    );
  });
});
