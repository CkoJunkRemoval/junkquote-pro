export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "TENANT_ACCESS_DENIED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "STORAGE_FAILED"
  | "PROVIDER_FAILED"
  | "DATABASE_FAILED"
  | "BACKGROUND_JOB_FAILED"
  | "INTERNAL_ERROR";
const statuses: Record<AppErrorCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  TENANT_ACCESS_DENIED: 404,
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  STORAGE_FAILED: 503,
  PROVIDER_FAILED: 502,
  DATABASE_FAILED: 503,
  BACKGROUND_JOB_FAILED: 500,
  INTERNAL_ERROR: 500,
};
export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = statuses[code];
  }
}
export function safeErrorResponse(error: unknown, requestId: string) {
  const app =
    error instanceof AppError
      ? error
      : new AppError("INTERNAL_ERROR", "Something went wrong.");
  const retryAfter = app.code === "RATE_LIMITED" && typeof app.details?.retryAfterSeconds === "number" ? String(Math.max(1, Math.ceil(app.details.retryAfterSeconds))) : undefined;
  return Response.json(
    { error: { code: app.code, message: app.message }, requestId },
    { status: app.status, headers: { "x-request-id": requestId, ...(retryAfter ? { "Retry-After": retryAfter } : {}) } },
  );
}
