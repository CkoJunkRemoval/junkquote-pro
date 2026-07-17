import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [Credentials({
    name: "Email and password",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { where: { status: "Active" }, take: 1 } } });
      if (!user?.active || !user.memberships.length || !(await bcrypt.compare(password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email };
    },
  })],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) { if (user) token.userId = user.id; return token; },
    session({ session, token }) { if (session.user && typeof token.userId === "string") session.user.id = token.userId; return session; },
  },
});
