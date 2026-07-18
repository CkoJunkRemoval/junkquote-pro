import type{MembershipRole}from"@/generated/prisma/client";export function canViewAuditLog(role:MembershipRole){return role==="Owner"||role==="Admin"}
