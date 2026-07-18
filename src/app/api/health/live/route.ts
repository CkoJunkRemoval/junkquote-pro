import {
  createRequestId,
  requestIdHeader,
} from "@/lib/observability/requestId";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const id = createRequestId(request.headers.get(requestIdHeader));
  return Response.json(
    { status: "live", requestId: id },
    { headers: { [requestIdHeader]: id, "cache-control": "no-store" } },
  );
}
