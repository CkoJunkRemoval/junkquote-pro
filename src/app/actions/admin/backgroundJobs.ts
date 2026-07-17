"use server";
import type { BackgroundJobStatus } from "@/generated/prisma/client";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { listBackgroundJobs } from "@/lib/backgroundJobs/admin";
import { databaseJobQueue } from "@/lib/backgroundJobs/databaseQueue";

export async function listBackgroundJobsAction(input: { status?: BackgroundJobStatus; page?: number } = {}) { const { companyId } = await requireAdminTenant(); return listBackgroundJobs(companyId, input); }
export async function retryBackgroundJobAction(jobId: string) { const { companyId } = await requireAdminTenant(); return databaseJobQueue.retry(companyId, jobId); }
export async function cancelBackgroundJobAction(jobId: string) { const { companyId } = await requireAdminTenant(); return databaseJobQueue.cancel(companyId, jobId); }
