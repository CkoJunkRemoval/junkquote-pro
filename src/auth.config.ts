import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request }) {
      const publicPrefixes = [
        "/approve",
        "/sign-in",
        "/sign-up",
        "/reset-password",
        "/api/auth",
        "/api/health",
        "/portal",
        "/api/private/assets",
        "/offline",
        "/sw.js",
        "/manifest.webmanifest",
        "/icons",
      ];
      const internal = !publicPrefixes.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      return !internal || Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
