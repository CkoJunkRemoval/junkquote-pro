import { prisma } from "../prisma";

export async function deleteJobSite(id: string) {
  return prisma.jobSite.delete({
    where: { id },
  });
}
