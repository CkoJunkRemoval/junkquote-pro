export type CommunicationChannel = "email" | "sms" | "reminder";
export type CommunicationMessage = { channel: CommunicationChannel; to: string; subject?: string; body: string };
export interface CommunicationProvider { send(message: CommunicationMessage, options: { idempotencyKey: string }): Promise<{ providerMessageId: string }> }

export class ConsoleEmailProvider implements CommunicationProvider {
  async send(message: CommunicationMessage, options: { idempotencyKey: string }) { if (message.channel !== "email" && message.channel !== "reminder") throw new Error("SMS provider is not configured."); const providerMessageId = `console-${options.idempotencyKey}`; console.info(JSON.stringify({ event: "communication.sent", provider: "console", providerMessageId, idempotencyKey: options.idempotencyKey, channel: message.channel, to: message.to, subject: message.subject })); return { providerMessageId }; }
}

export const consoleEmailProvider = new ConsoleEmailProvider();
