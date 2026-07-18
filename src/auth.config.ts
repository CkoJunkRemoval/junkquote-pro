import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request }) {
      const publicPrefixes = [
        "/approve",
        "/sign-in",
        "/api/auth",
        "/api/health",
        "/portal",
        "/api/private/assets",
      ];
      const internal = !publicPrefixes.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      return !internal || Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
