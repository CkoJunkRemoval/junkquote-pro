"use server";
import type {
  FieldChangeOrderType,
  FieldJobStage,
  FieldTimeEventType,
} from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  assertFieldJobAccess,
  addFieldNote,
  confirmFieldCompletion,
  ensureFieldChecklist,
  recordDisposal,
  recordFieldPhotoEvent,
  recordFieldTimeEvent,
  requestFieldChangeOrder,
  resolveFieldActor,
  reviewFieldChangeOrder,
  saveCompletionSignature,
  transitionFieldStage,
  updateFieldChecklist,
} from "@/lib/fieldOperations/fieldOperations";
import {
  deleteJobPhoto,
  reorderJobPhotos,
  uploadJobPhotoIdempotent,
  uploadJobPhotos,
  updateJobPhoto,
} from "@/lib/jobPhotos/jobPhotos";
import type { JobPhotoCategory } from "@/generated/prisma/client";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

async function context() {
  const tenant = await requireTenantContext();
  return { tenant, actor: await resolveFieldActor(tenant) };
}
export async function transitionFieldStageAction(
  jobId: string,
  stage: FieldJobStage,
  baseVersion: number,
  latitude?: number,
  longitude?: number,
) {
  const { tenant, actor } = await context();
  return transitionFieldStage(tenant.companyId, jobId, actor, stage, {
    baseVersion,
    latitude,
    longitude,
  });
}
export async function ensureFieldChecklistAction(jobId: string) {
  const { tenant, actor } = await context();
  return ensureFieldChecklist(tenant.companyId, jobId, actor);
}
export async function updateFieldChecklistAction(
  jobId: string,
  key: string,
  completed: boolean,
  notes?: string,
) {
  const { tenant, actor } = await context();
  return updateFieldChecklist(
    tenant.companyId,
    jobId,
    actor,
    key,
    completed,
    notes,
  );
}
export async function addFieldNoteAction(jobId:string,note:string){
  const {tenant,actor}=await context();
  return addFieldNote(tenant.companyId,jobId,actor,note);
}
export async function requestFieldChangeOrderAction(
  jobId: string,
  input: {
    type: FieldChangeOrderType;
    description: string;
    proposedAmount: number;
  },
) {
  const { tenant, actor } = await context();
  const limit=await checkRateLimit(`field-change:${tenant.companyId}:${actor.userId}`,ratePolicies.fieldChangeOrder);
  if(!limit.allowed)throw new Error("Too many change-order requests. Try again shortly.");
  return requestFieldChangeOrder(tenant.companyId, jobId, actor, input);
}
export async function saveCompletionSignatureAction(
  jobId: string,
  input: {
    printedName: string;
    signatureData: string;
    device: string;
    notes?: string;
  },
) {
  const { tenant, actor } = await context();
  return saveCompletionSignature(tenant.companyId, jobId, actor, input);
}
export async function recordFieldTimeEventAction(
  jobId: string,
  type: FieldTimeEventType,
) {
  const { tenant, actor } = await context();
  return recordFieldTimeEvent(tenant.companyId, jobId, actor, type);
}
export async function recordDisposalAction(
  jobId: string,
  input: Parameters<typeof recordDisposal>[3],
) {
  const { tenant, actor } = await context();
  return recordDisposal(tenant.companyId, jobId, actor, input);
}
export async function reviewFieldChangeOrderAction(
  orderId: string,
  input: Parameters<typeof reviewFieldChangeOrder>[3],
) {
  const { tenant, actor } = await context();
  return reviewFieldChangeOrder(tenant.companyId, orderId, actor, input);
}
export async function confirmFieldCompletionAction(
  jobId: string,
  notes: string,
) {
  const { tenant, actor } = await context();
  return confirmFieldCompletion(tenant.companyId, jobId, actor, notes);
}
export async function uploadFieldPhotosAction(formData: FormData) {
  const { tenant, actor } = await context();
  const jobId = String(formData.get("jobId") ?? "");
  await assertFieldJobAccess(tenant.companyId, jobId, actor);
  const files = formData
    .getAll("files")
    .filter((v): v is File => v instanceof File);
  const photos = await uploadJobPhotos(tenant.companyId, jobId, {
    category: String(formData.get("category") ?? "During") as JobPhotoCategory,
    files,
  });
  await recordFieldPhotoEvent(
    tenant.companyId,
    jobId,
    actor,
    photos.map((p) => p.id),
    "added",
  );
  return photos;
}
export async function uploadQueuedFieldPhotoAction(formData: FormData) {
  const { tenant, actor } = await context();
  const limit=await checkRateLimit(`field-upload:${tenant.companyId}:${actor.userId}`,ratePolicies.fieldUpload);
  if(!limit.allowed)throw new Error("Photo upload rate limit reached. Upload will retry automatically.");
  const jobId = String(formData.get("jobId") ?? "");
  await assertFieldJobAccess(tenant.companyId, jobId, actor);
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Photo file is required.");
  const requestedVisible = formData.get("customerVisible") === "true";
  const photo = await uploadJobPhotoIdempotent(tenant.companyId, jobId, {
    file,
    category: String(formData.get("category") ?? "During") as JobPhotoCategory,
    clientOperationId: String(formData.get("clientOperationId") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    customerVisible: actor.manager && requestedVisible,
    annotationMetadata: formData.get("annotationMetadata")
      ? JSON.parse(String(formData.get("annotationMetadata")))
      : undefined,
    originalPhotoId: String(formData.get("originalPhotoId") ?? "") || undefined,
  });
  await recordFieldPhotoEvent(
    tenant.companyId,
    jobId,
    actor,
    [photo.id],
    "added",
  );
  return { id: photo.id };
}
export async function updateFieldPhotoAction(
  jobId: string,
  photoId: string,
  input: {
    caption?: string | null;
    annotation?: string | null;
    customerVisible?: boolean;
    category?: JobPhotoCategory;
  },
) {
  const { tenant, actor } = await context();
  await assertFieldJobAccess(tenant.companyId, jobId, actor);
  const photo = await updateJobPhoto(tenant.companyId, photoId, {
    ...input,
    customerVisible: actor.manager ? input.customerVisible : false,
  });
  await recordFieldPhotoEvent(
    tenant.companyId,
    jobId,
    actor,
    [photo.id],
    "updated",
  );
  return photo;
}
export async function deleteFieldPhotoAction(jobId: string, photoId: string) {
  const { tenant, actor } = await context();
  const job = await assertFieldJobAccess(tenant.companyId, jobId, actor);
  if (["Completed", "ReadyForInvoice"].includes(job.fieldStage))
    throw new Error("Photos cannot be deleted after field completion.");
  await deleteJobPhoto(tenant.companyId, photoId);
  await recordFieldPhotoEvent(
    tenant.companyId,
    jobId,
    actor,
    [photoId],
    "removed",
  );
}
export async function reorderFieldPhotosAction(
  jobId: string,
  photoIds: string[],
) {
  const { tenant, actor } = await context();
  await assertFieldJobAccess(tenant.companyId, jobId, actor);
  await reorderJobPhotos(tenant.companyId, jobId, photoIds);
}
