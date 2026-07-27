import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
const { auth } = NextAuth(authConfig);
const valid = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
export default auth((request) => {
  const inbound = request.headers.get("x-request-id");
  const requestId =
    inbound && valid.test(inbound) ? inbound : crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  if (
    !request.auth?.user &&
    request.cookies.has("jq_portal_session") &&
    request.nextUrl.pathname !== "/access-denied"
  ) {
    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = "/access-denied";
    deniedUrl.search = "";
    const denied = NextResponse.rewrite(deniedUrl, { request: { headers } });
    denied.headers.set("x-request-id", requestId);
    return denied;
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
});
export const config = {
  matcher: [
    "/((?!api/auth|api/health|approve|portal|api/private/assets|access-denied|sign-in|sign-up|join|offline|sw.js|manifest.webmanifest|icons|_next/static|_next/image|favicon.ico).*)",
  ],
};
