import { prisma } from "../prisma";
export async function getInvoiceDashboardSummary(companyId: string, now = new Date()) {
  const month = new Date(now.getFullYear(), now.getMonth(), 1); const year = new Date(now.getFullYear(), 0, 1);
  const [outstanding, overdue, monthPayments, yearPayments, averages] = await Promise.all([
    prisma.invoice.aggregate({ where: { companyId, balanceDue: { gt: 0 }, status: { notIn: ["Draft", "Void", "Cancelled"] } }, _sum: { balanceDue: true }, _count: true }),
    prisma.invoice.aggregate({ where: { companyId, balanceDue: { gt: 0 }, dueDate: { lt: now }, status: { notIn: ["Paid", "Void", "Cancelled"] } }, _sum: { balanceDue: true }, _count: true }),
    prisma.payment.aggregate({ where: { companyId, paymentDate: { gte: month, lte: now } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { companyId, paymentDate: { gte: year, lte: now } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { companyId, status: { notIn: ["Draft", "Void", "Cancelled"] } }, _avg: { total: true } }),
  ]);
  return { outstanding: outstanding._sum.balanceDue ?? 0, outstandingCount: outstanding._count, overdue: overdue._sum.balanceDue ?? 0, overdueCount: overdue._count, revenueMonth: monthPayments._sum.amount ?? 0, revenueYtd: yearPayments._sum.amount ?? 0, averageInvoice: averages._avg.total ?? 0 };
}
