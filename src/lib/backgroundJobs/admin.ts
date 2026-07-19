import type { BackgroundJobStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function listBackgroundJobs(
  companyId: string,
  input: {
    status?: BackgroundJobStatus;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const where = {
    companyId,
    ...(input.status ? { status: input.status } : {}),
  };
  const [jobs, total, lastCompleted, running] = await prisma.$transaction([
    prisma.backgroundJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.backgroundJob.count({ where }),
    prisma.backgroundJob.findFirst({
      where: { companyId, status: "Completed" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, type: true },
    }),
    prisma.backgroundJob.count({ where: { companyId, status: "Running" } }),
  ]);
  return {
    jobs,
    total,
    page,
    pageSize,
    workerHealth: {
      lastSuccessAt: lastCompleted?.completedAt ?? null,
      lastSuccessType: lastCompleted?.type ?? null,
      running,
    },
  };
}
