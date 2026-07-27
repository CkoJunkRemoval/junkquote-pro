import { forbidden } from "next/navigation";
import { requirePlatformAdmin } from "./platformAuth";

export async function requirePlatformAdminPage(operation: string) {
  try {
    return await requirePlatformAdmin(operation);
  } catch {
    forbidden();
  }
}
