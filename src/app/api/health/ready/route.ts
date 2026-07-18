import { checkReadiness } from "@/lib/production/readiness";
import {
  createRequestId,
  requestIdHeader,
} from "@/lib/observability/requestId";
import { logger } from "@/lib/observability/logger";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = createRequestId(request.headers.get(requestIdHeader));
  const started = Date.now();
  try {
    const result = await checkReadiness();
    logger.info("health.ready", {
      requestId: id,
      duration: Date.now() - started,
      ready: result.ready,
    });
    return Response.json(
      {
        status: result.ready ? "ready" : "not_ready",
        checks: result.checks,
        requestId: id,
      },
      {
        status: result.ready ? 200 : 503,
        headers: { [requestIdHeader]: id, "cache-control": "no-store" },
      },
    );
  } catch {
    logger.error("health.ready_failed", {
      requestId: id,
      duration: Date.now() - started,
    });
    return Response.json(
      { status: "not_ready", requestId: id },
      {
        status: 503,
        headers: { [requestIdHeader]: id, "cache-control": "no-store" },
      },
    );
  }
}
