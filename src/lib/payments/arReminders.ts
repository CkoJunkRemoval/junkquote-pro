import { prisma } from "@/lib/prisma";
import { sendOrEnqueueCommunication } from "@/lib/communications/queueCommunication";
export async function configureArReminder(
  companyId: string,
  input: {
    name: string;
    daysOffset: number;
    subject: string;
    body: string;
    enabled?: boolean;
  },
) {
  if (
    !Number.isInteger(input.daysOffset) ||
    input.daysOffset < -30 ||
    input.daysOffset > 365
  )
    throw new Error("Reminder offset must be between -30 and 365 days.");
  return prisma.arReminderPolicy.upsert({
    where: {
      companyId_daysOffset_channel: {
        companyId,
        daysOffset: input.daysOffset,
        channel: "Email",
      },
    },
    create: {
      companyId,
      name: input.name.trim(),
      daysOffset: input.daysOffset,
      subject: input.subject.trim(),
      body: input.body.trim(),
      enabled: input.enabled ?? true,
    },
    update: {
      name: input.name.trim(),
      subject: input.subject.trim(),
      body: input.body.trim(),
      enabled: input.enabled ?? true,
    },
  });
}
export async function dispatchDueArReminders(
  companyId: string,
  now = new Date(),
) {
  const policies = await prisma.arReminderPolicy.findMany({
      where: { companyId, enabled: true, channel: "Email" },
    }),
    sent = [];
  for (const policy of policies) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - policy.daysOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        balanceDue: { gt: 0 },
        dueDate: { gte: start, lt: end },
        status: { notIn: ["Void", "Cancelled"] },
      },
      include: {
        customer: { select: { email: true, firstName: true } },
        company: { select: { displayName: true } },
      },
    });
    for (const invoice of invoices) {
      if (!invoice.customer.email) continue;
      await sendOrEnqueueCommunication(companyId, {
        channel: "email",
        to: invoice.customer.email,
        subject: policy.subject.replaceAll(
          "{{invoice}}",
          invoice.displayNumber ?? String(invoice.invoiceNumber),
        ),
        body: policy.body
          .replaceAll("{{customer}}", invoice.customer.firstName)
          .replaceAll("{{balance}}", invoice.balanceDue.toFixed(2)),
        idempotencyKey: `ar:${policy.id}:${invoice.id}:${now.toISOString().slice(0, 10)}`,
      });
      sent.push(invoice.id);
    }
  }
  return sent;
}
