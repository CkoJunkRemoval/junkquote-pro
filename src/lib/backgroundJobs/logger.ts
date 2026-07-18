export type JobLogLevel = "info" | "error";
export interface JobLogger { log(level: JobLogLevel, event: string, fields: Record<string, unknown>): void; }
export const consoleJobLogger: JobLogger = { log(level, event, fields) { log(level, event, fields); } };
import { log } from "@/lib/observability/logger";
