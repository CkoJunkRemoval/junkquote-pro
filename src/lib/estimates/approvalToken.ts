import { randomBytes } from "node:crypto";

export function generateApprovalToken() {
  return randomBytes(32).toString("base64url");
}
