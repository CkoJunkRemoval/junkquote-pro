import type{MembershipRole}from"@/generated/prisma/client";export function dispatchAccess(role:MembershipRole){return{canView:true,canOperate:role!=="Crew",assignedOnly:role==="Crew"};}
