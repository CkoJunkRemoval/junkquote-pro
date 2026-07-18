import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redactLogData } from "@/lib/observability/logger";
export type AuditInput = {
  companyId?: string | null;
  actingUserId?: string | null;
  portalAccessId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
};
export async function recordAuditEvent(input: AuditInput) {
  const metadata = input.metadata
    ? (redactLogData(input.metadata) as Prisma.InputJsonValue)
    : undefined;
  return prisma.auditEvent.create({
    data: {
      companyId: input.companyId ?? null,
      actingUserId: input.actingUserId ?? null,
      portalAccessId: input.portalAccessId ?? null,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      requestId: input.requestId ?? null,
      metadata,
    },
  });
}
export type AuditFilters = {
  from?: Date;
  to?: Date;
  actorId?: string;
  eventType?: string;
  entity?: string;
  requestId?: string;
  page?: number;
  pageSize?: number;
};
export async function listAuditEvents(
  companyId: string,
  filters: AuditFilters = {},
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const where = {
    companyId,
    createdAt: { gte: filters.from, lte: filters.to },
    ...(filters.actorId ? { actingUserId: filters.actorId } : {}),
    ...(filters.eventType ? { eventType: filters.eventType } : {}),
    ...(filters.entity
      ? {
          OR: [
            {
              entityType: {
                contains: filters.entity,
                mode: "insensitive" as const,
              },
            },
            {
              entityId: {
                contains: filters.entity,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(filters.requestId ? { requestId: filters.requestId } : {}),
  };
  const [events, total, actors, eventTypes] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actingUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        portalAccess: { select: { id: true, email: true } },
      },
    }),
    prisma.auditEvent.count({ where }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { email: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { companyId },
      distinct: ["eventType"],
      select: { eventType: true },
      orderBy: { eventType: "asc" },
    }),
  ]);
  return {
    events,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    actors,
    eventTypes: eventTypes.map((x) => x.eventType),
  };
}
