import type { Prisma, ReminderType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateReminderScheduleInput { type: ReminderType; targetId?: string; scheduledFor: Date; payload: Prisma.InputJsonValue; createdByUserId?: string | null; }
export async function createReminderSchedule(companyId: string, input: CreateReminderScheduleInput) { if (input.scheduledFor.getTime() <= Date.now()) throw new Error("Reminder must be scheduled in the future."); return prisma.reminderSchedule.create({ data: { companyId, type: input.type, targetId: input.targetId?.trim() || null, scheduledFor: input.scheduledFor, payload: input.payload, createdByUserId: input.createdByUserId ?? null } }); }
export function listReminderSchedules(companyId: string, enabled?: boolean) { return prisma.reminderSchedule.findMany({ where: { companyId, ...(enabled === undefined ? {} : { enabled }) }, orderBy: { scheduledFor: "asc" } }); }
export async function disableReminderSchedule(companyId: string, reminderId: string) { const reminder = await prisma.reminderSchedule.findFirst({ where: { id: reminderId, companyId }, select: { id: true } }); if (!reminder) throw new Error("Reminder not found."); return prisma.reminderSchedule.update({ where: { id: reminder.id }, data: { enabled: false } }); }
