import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { recordAuditEvent } from "@/lib/audit/audit";
import { headers } from "next/headers";
import { getLoginLockout, recordFailedLogin, resetLoginLockout } from "@/lib/security/loginLockout";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        const requestHeaders = await headers();
        const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
        if (
          !(await checkRateLimit(`staff-sign-in:email:${email}`, ratePolicies.signIn)).allowed ||
          !(await checkRateLimit(`staff-sign-in:ip:${ip}`, ratePolicies.signIn)).allowed
        )
          return null;
        if ((await getLoginLockout(email)).locked) return null;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { where: { status: "Active" }, take: 1 } },
        });
        const passwordMatches=user?await bcrypt.compare(password,user.passwordHash):false;
        if (!user?.active || !user.memberships.length || !passwordMatches){
          const lockout = await recordFailedLogin(email);
          if(user)await recordAuditEvent({companyId:user.companyId,actingUserId:user.id,eventType:lockout.locked?"authentication.login_locked":"authorization.failed",entityType:"User",entityId:user.id,metadata:{operation:"staff_sign_in",attemptBucket:lockout.attempts>=10?"10+":lockout.attempts>=7?"7-9":lockout.attempts>=5?"5-6":"under-5"}}).catch(()=>undefined);
          return null;
        }
        await resetLoginLockout(email);
        await prisma.user.update({where:{id:user.id},data:{lastLogin:new Date()}});
        await recordAuditEvent({companyId:user.companyId,actingUserId:user.id,eventType:"authentication.login_succeeded",entityType:"User",entityId:user.id}).catch(()=>undefined);
        return {
          id: user.id,
          email: user.email,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) { token.userId = user.id; token.sessionVersion = (user as typeof user & {sessionVersion:number}).sessionVersion; }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") { session.user.id = token.userId; (session as typeof session & {sessionVersion?:number}).sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : undefined; }
      return session;
    },
  },
});
