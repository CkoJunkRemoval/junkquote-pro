import { randomBytes } from "node:crypto";
const valid = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
export function createRequestId(inbound?: string | null) {
  return inbound && valid.test(inbound)
    ? inbound
    : randomBytes(16).toString("hex");
}
export const requestIdHeader = "x-request-id";
