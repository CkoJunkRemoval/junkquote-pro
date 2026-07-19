import { AppError } from "@/lib/errors/appError";
export type CommunicationChannel = "email" | "sms" | "reminder";
export type CommunicationMessage = {
  channel: CommunicationChannel;
  to: string;
  subject?: string;
  body: string;
};
export type ProviderSendOptions = {
  idempotencyKey: string;
  requestId?: string;
  communicationId?: string;
};
export interface CommunicationProvider {
  readonly name?: string;
  send(
    message: CommunicationMessage,
    options: ProviderSendOptions,
  ): Promise<{ providerMessageId: string }>;
}
export class ConsoleEmailProvider implements CommunicationProvider {
  readonly name = "console";
  async send(message: CommunicationMessage, options: ProviderSendOptions) {
    if (message.channel !== "email" && message.channel !== "reminder")
      throw new AppError("PROVIDER_FAILED", "SMS provider is not configured.");
    const providerMessageId = `console-${options.idempotencyKey}`;
    console.info(
      JSON.stringify({
        event: "communication.sent",
        provider: "console",
        providerMessageId,
        idempotencyKey: options.idempotencyKey,
        channel: message.channel,
        requestId: options.requestId,
        communicationId: options.communicationId,
      }),
    );
    return { providerMessageId };
  }
}
export class ResendEmailProvider implements CommunicationProvider {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async send(message: CommunicationMessage, options: ProviderSendOptions) {
    if (message.channel !== "email" && message.channel !== "reminder")
      throw new AppError(
        "PROVIDER_FAILED",
        "The configured provider cannot send SMS.",
      );
    try {
      const response = await this.fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": options.idempotencyKey,
          "X-Entity-Ref-ID": options.communicationId ?? options.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject ?? "JunkQuote Pro notification",
          text: message.body,
          headers: {
            ...(options.requestId
              ? { "X-JunkQuote-Request-ID": options.requestId }
              : {}),
            ...(options.communicationId
              ? { "X-JunkQuote-Communication-ID": options.communicationId }
              : {}),
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string };
      if (!response.ok || !data.id)
        throw new AppError(
          "PROVIDER_FAILED",
          "Email provider rejected the message.",
          { providerStatus: response.status },
        );
      return { providerMessageId: data.id };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "PROVIDER_FAILED",
        "Email delivery is temporarily unavailable.",
      );
    }
  }
}
export const consoleEmailProvider = new ConsoleEmailProvider();
export function selectCommunicationProvider(
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): CommunicationProvider {
  const name =
    env.EMAIL_PROVIDER ?? (env.NODE_ENV === "production" ? "" : "console");
  if (name === "console") {
    if (env.NODE_ENV === "production")
      throw new AppError(
        "PROVIDER_FAILED",
        "Console email is disabled in production.",
      );
    return consoleEmailProvider;
  }
  if (name === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
      throw new AppError(
        "PROVIDER_FAILED",
        "Resend email configuration is incomplete.",
      );
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM, fetcher);
  }
  throw new AppError(
    "PROVIDER_FAILED",
    "Unsupported email provider configuration.",
  );
}
