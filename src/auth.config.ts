import type { NextAuthConfig } from "next-auth";

const publicPrefixes = [
  "/approve",
  "/sign-in",
  "/sign-up",
  "/pricing",
  "/join",
  "/reset-password",
  "/api/auth",
  "/api/health",
  "/api/webhooks",
  "/portal",
  "/api/private/assets",
  "/offline",
  "/sw.js",
  "/manifest.webmanifest",
  "/icons",
];

export function isPublicAuthPath(pathname: string) {
  return pathname === "/" || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export const authConfig = {
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request }) {
      const internal = !isPublicAuthPath(request.nextUrl.pathname);
      return !internal || Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
