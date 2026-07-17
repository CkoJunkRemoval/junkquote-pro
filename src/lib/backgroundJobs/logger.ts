export type JobLogLevel = "info" | "error";
export interface JobLogger { log(level: JobLogLevel, event: string, fields: Record<string, unknown>): void; }
export const consoleJobLogger: JobLogger = { log(level, event, fields) { const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields }); if (level === "error") console.error(record); else console.info(record); } };
