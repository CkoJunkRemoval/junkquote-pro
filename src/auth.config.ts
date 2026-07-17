import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request }) {
      const internal = !request.nextUrl.pathname.startsWith("/approve") && !request.nextUrl.pathname.startsWith("/sign-in") && !request.nextUrl.pathname.startsWith("/api/auth");
      return !internal || Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
