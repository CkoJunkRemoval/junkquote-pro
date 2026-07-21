"use server";
import type { BackgroundJobStatus } from "@/generated/prisma/client";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { listBackgroundJobs } from "@/lib/backgroundJobs/admin";
import { databaseJobQueue } from "@/lib/backgroundJobs/databaseQueue";
import{checkRateLimit,ratePolicies}from"@/lib/security/rateLimit";import{AppError}from"@/lib/errors/appError";

export async function listBackgroundJobsAction(input: { status?: BackgroundJobStatus; page?: number } = {}) { const { companyId } = await requireAdminTenant(); return listBackgroundJobs(companyId, input); }
export async function retryBackgroundJobAction(jobId: string) { const c = await requireAdminTenant();if(!(await checkRateLimit(`job-retry:${c.companyId}:${c.user.id}`,ratePolicies.backgroundRetry)).allowed)throw new AppError("RATE_LIMITED","Too many retry requests.");return databaseJobQueue.retry(c.companyId, jobId); }
export async function cancelBackgroundJobAction(jobId: string) { const { companyId } = await requireAdminTenant(); return databaseJobQueue.cancel(companyId, jobId); }
