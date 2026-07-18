import { headers } from "next/headers";
import {
  createRequestId,
  requestIdHeader,
} from "@/lib/observability/requestId";
export async function currentRequestId() {
  return createRequestId((await headers()).get(requestIdHeader));
}
