import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  confirmFieldCompletion,
  ensureFieldChecklist,
  getFieldDashboard,
  getFieldJob,
  recordDisposal,
  recordFieldTimeEvent,
  requestFieldChangeOrder,
  reviewFieldChangeOrder,
  saveCompletionSignature,
  syncFieldOperations,
  transitionFieldStage,
  updateFieldChecklist,
  type FieldActor,
} from "@/lib/fieldOperations/fieldOperations";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("field operations v1", () => {
  let fixtures: Awaited<ReturnType<typeof createTenantFixtures>>;
  let actor: FieldActor;
  let otherActor: FieldActor;
  beforeAll(async () => {
    await resetIntegrationDatabase();
    fixtures = await createTenantFixtures();
    actor = {
      userId: fixtures.a.user.id,
      employeeId: fixtures.a.employee.id,
      displayName: "Crew A",
      manager: false,
    };
    otherActor = {
      userId: fixtures.b.user.id,
      employeeId: fixtures.b.employee.id,
      displayName: "Crew B",
      manager: false,
    };
    await prisma.job.update({
      where: { id: fixtures.a.job.id },
      data: {
        status: "Scheduled",
        scheduledStart: new Date(),
        fieldStage: "Scheduled",
      },
    });
    await prisma.estimate.update({
      where: { id: fixtures.a.estimate.id },
      data: { status: "Scheduled" },
    });
    await prisma.jobAssignment.create({
      data: {
        companyId: fixtures.a.company.id,
        jobId: fixtures.a.job.id,
        employeeId: fixtures.a.employee.id,
      },
    });
  });
  afterAll(resetIntegrationDatabase);

  it("limits crew dashboards and job detail to assigned jobs", async () => {
    const dashboard = await getFieldDashboard(fixtures.a.company.id, actor);
    expect(dashboard.today.map((j) => j.id)).toContain(fixtures.a.job.id);
    await expect(
      getFieldJob(fixtures.a.company.id, fixtures.a.job.id, otherActor),
    ).rejects.toThrow("not assigned");
  });
  it("enforces ordered stages and writes centralized events", async () => {
    await expect(
      transitionFieldStage(
        fixtures.a.company.id,
        fixtures.a.job.id,
        actor,
        "Arrived",
      ),
    ).rejects.toThrow("Complete each required stage");
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "EnRoute",
      { latitude: 40, longitude: -73 },
    );
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "Arrived",
      { latitude: 40.1, longitude: -73.1 },
    );
    const [timeline, activity, audit] = await Promise.all([
      prisma.estimateTimelineEvent.count({
        where: {
          estimateId: fixtures.a.estimate.id,
          eventType: { in: ["Crew En Route", "Crew Arrived"] },
        },
      }),
      prisma.estimateActivityFeedItem.count({
        where: {
          estimateId: fixtures.a.estimate.id,
          eventType: { in: ["Crew En Route", "Crew Arrived"] },
        },
      }),
      prisma.auditEvent.count({
        where: {
          companyId: fixtures.a.company.id,
          entityId: fixtures.a.estimate.id,
          eventType: {
            in: ["estimate.crew_en_route", "estimate.crew_arrived"],
          },
        },
      }),
    ]);
    expect({ timeline, activity, audit }).toEqual({
      timeline: 2,
      activity: 2,
      audit: 2,
    });
  });
  it("records checklist, change orders, signature, time, and disposal", async () => {
    const checklist = await ensureFieldChecklist(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
    );
    expect(checklist).toHaveLength(6);
    for (const item of checklist)
      await updateFieldChecklist(
        fixtures.a.company.id,
        fixtures.a.job.id,
        actor,
        item.key,
        true,
      );
    const order = await requestFieldChangeOrder(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      {
        type: "AdditionalItems",
        description: "Extra chair",
        proposedAmount: 25,
      },
    );
    expect(order.status).toBe("Submitted");
    const manager={...actor,manager:true,displayName:"Manager A"};
    const reviewed=await reviewFieldChangeOrder(fixtures.a.company.id,order.id,manager,{decision:"approve",version:order.version,requiresCustomerApproval:true});
    expect(reviewed.status).toBe("CustomerApprovalRequired");
    await expect(reviewFieldChangeOrder(fixtures.a.company.id,order.id,manager,{decision:"approve",version:order.version})).rejects.toThrow("already been reviewed");
    await prisma.fieldChangeOrder.update({
      where: { id: order.id },
      data: { status: "Approved", customerApprovedAt: new Date() },
    });
    await saveCompletionSignature(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      {
        printedName: "Customer A",
        signatureData: "signed",
        device: "test-device",
      },
    );
    await recordFieldTimeEvent(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "ClockIn",
    );
    await recordFieldTimeEvent(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "ClockOut",
    );
    const disposal = await recordDisposal(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      {
        category: "Recycling",
        facility: "Test facility",
        weight: 20,
        cost: 5,
        receiptUrl: "/receipt.pdf",
      },
    );
    expect(disposal.weight).toBe(20);
    const second=await recordDisposal(fixtures.a.company.id,fixtures.a.job.id,actor,{category:"Landfill",facility:"Second facility",weight:10,weightUnit:"lb",cost:7,paymentMethod:"Cash",receiptUrl:"/second-receipt.pdf"});
    expect(second.totalCost).toBe(12);
    expect((await prisma.job.findUniqueOrThrow({where:{id:fixtures.a.job.id}})).actualDisposalCost).toBe(12);
  });
  it("requires completion evidence then completes lifecycle and invoice readiness", async () => {
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "Working",
    );
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "Loading",
    );
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "Cleanup",
    );
    await expect(
      transitionFieldStage(
        fixtures.a.company.id,
        fixtures.a.job.id,
        actor,
        "Completed",
      ),
    ).rejects.toThrow("before and after photos");
    await prisma.jobPhoto.create({
      data: {
        companyId: fixtures.a.company.id,
        jobId: fixtures.a.job.id,
        category: "After",
        fileUrl: "/after.jpg",
        fileName: "after.jpg",
        mimeType: "image/jpeg",
        fileSize: 1,
        sortOrder: 0,
      },
    });
    await confirmFieldCompletion(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "All work complete",
    );
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "Completed",
    );
    await transitionFieldStage(
      fixtures.a.company.id,
      fixtures.a.job.id,
      actor,
      "ReadyForInvoice",
    );
    const job = await prisma.job.findUniqueOrThrow({
      where: { id: fixtures.a.job.id },
    });
    expect(job.fieldStage).toBe("ReadyForInvoice");
    expect(job.status).toBe("Completed");
  });
  it("makes offline sync idempotent and reports version conflicts", async () => {
    const job = await prisma.job.findUniqueOrThrow({
      where: { id: fixtures.a.job.id },
      select: { fieldVersion: true },
    });
    const operation = {
      clientOperationId: "field-op-1",
      jobId: fixtures.a.job.id,
      operationType: "note" as const,
      payload: { notes: "Synced note" },
      baseVersion: job.fieldVersion,
    };
    const first = await syncFieldOperations(fixtures.a.company.id, actor, [
      operation,
    ]);
    const repeated = await syncFieldOperations(fixtures.a.company.id, actor, [
      operation,
    ]);
    expect(first[0].status).toBe("Applied");
    expect(repeated[0].id).toBe(first[0].id);
    const conflict = await syncFieldOperations(fixtures.a.company.id, actor, [
      { ...operation, clientOperationId: "field-op-2", baseVersion: 0 },
    ]);
    expect(conflict[0].status).toBe("Conflict");
  });
});
