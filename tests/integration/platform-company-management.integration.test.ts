import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { changeCompanyClassification, deleteTestCompany, mutateManualTrial, setCompanySuspension } from "@/lib/admin/platformCompanyManagement";
import { getPlatformOverview } from "@/lib/admin/platformAnalytics";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("platform company management", () => {
  beforeEach(resetIntegrationDatabase);
  afterEach(resetIntegrationDatabase);

  async function actor() {
    const company = await prisma.company.create({ data: { name: "Platform actor tenant" } });
    return prisma.user.create({ data: { companyId: company.id, email: `platform-${crypto.randomUUID()}@test.invalid`, passwordHash: "test", role: "OWNER", platformAdmin: true } });
  }

  it("permits only confirmed, reasoned, financially-safe TEST deletion and leaves a safe tombstone", async () => {
    const admin = await actor();
    const customer = await prisma.company.create({ data: { name: "Real Customer" } });
    await expect(deleteTestCompany(admin.id, customer.id, customer.name, "cleanup")).rejects.toThrow("Only TEST");

    const unsafe = await prisma.company.create({ data: { name: "Unsafe Test", classification: "TEST", subscription: { create: { plan: "Professional", status: "Active", stripeSubscriptionId: "sub_live_evidence", lastSuccessfulPaymentAt: new Date() } } } });
    await expect(deleteTestCompany(admin.id, unsafe.id, unsafe.name, "cleanup")).rejects.toThrow("financial activity");

    const safe = await prisma.company.create({ data: { name: "Safe Test", classification: "TEST", customers: { create: { firstName: "Fixture", lastName: "Customer", phone: "555-0100" } } } });
    await expect(deleteTestCompany(admin.id, safe.id, "wrong", "cleanup")).rejects.toThrow("exact company name");
    await expect(deleteTestCompany(admin.id, safe.id, safe.name, " ")).rejects.toThrow("reason");
    await deleteTestCompany(admin.id, safe.id, safe.name, "Disposable fixture cleanup");
    expect(await prisma.company.findUnique({ where: { id: safe.id } })).toBeNull();
    expect(await prisma.customer.count({ where: { companyId: safe.id } })).toBe(0);
    expect(await prisma.platformCompanyDeletionTombstone.findFirst({ where: { deletedCompanyId: safe.id } })).toMatchObject({ companyName: safe.name, classification: "TEST", reason: "Disposable fixture cleanup" });
  });

  it("deletes a populated TEST tenant through the existing cascade architecture", async () => {
    const admin = await actor(), fixtures = await createTenantFixtures();
    await prisma.company.update({ where: { id: fixtures.a.company.id }, data: { classification: "TEST" } });
    await deleteTestCompany(admin.id, fixtures.a.company.id, fixtures.a.company.name, "Fixture tenant cleanup");
    expect(await prisma.company.findUnique({ where: { id: fixtures.a.company.id } })).toBeNull();
    expect(await prisma.estimate.count({ where: { companyId: fixtures.a.company.id } })).toBe(0);
    expect(await prisma.invoice.count({ where: { companyId: fixtures.a.company.id } })).toBe(0);
    expect(await prisma.payment.count({ where: { companyId: fixtures.a.company.id } })).toBe(0);
  });

  it("suspends without changing Stripe state and reactivation restores membership access", async () => {
    const admin = await actor(), fixtures = await createTenantFixtures(), id = fixtures.a.company.id;
    await prisma.company.update({ where: { id }, data: { stripeConnectStatus: "CONNECTED", stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeDetailsSubmitted: true, subscription: { create: { plan: "Starter", status: "Active", stripeSubscriptionId: "sub_preserved", lastSuccessfulPaymentAt: new Date() } } } });
    await setCompanySuspension(admin.id, id, true, "Support investigation");
    const activeMembership = () => prisma.companyMembership.findFirst({ where: { userId: fixtures.a.user.id, status: "Active", company: { active: true } } });
    expect(await activeMembership()).toBeNull();
    expect(await prisma.company.findUniqueOrThrow({ where: { id }, select: { active: true, stripeConnectStatus: true, stripeChargesEnabled: true, stripePayoutsEnabled: true, subscription: { select: { status: true, stripeSubscriptionId: true } } } })).toEqual({ active: false, stripeConnectStatus: "CONNECTED", stripeChargesEnabled: true, stripePayoutsEnabled: true, subscription: { status: "Active", stripeSubscriptionId: "sub_preserved" } });
    await setCompanySuspension(admin.id, id, false, "Support resolution");
    expect(await activeMembership()).toMatchObject({ companyId: id });
    expect(await prisma.auditEvent.count({ where: { companyId: id, eventType: { in: ["platform_admin.company_suspended", "platform_admin.company_reactivated"] } } })).toBe(2);
    expect((await prisma.user.findUniqueOrThrow({where:{id:admin.id},select:{sessionVersion:true}})).sessionVersion).toBe(0);
  });

  it("classification changes immediately control the default and included analytics populations", async () => {
    const admin = await actor();
    const customer = await prisma.company.create({ data: { name: "Customer metric" } });
    const test = await prisma.company.create({ data: { name: "Test metric", classification: "TEST" } });
    const internal = await prisma.company.create({ data: { name: "Internal metric", classification: "INTERNAL" } });
    const before = await getPlatformOverview();
    expect(before.registered).toBe(2); // customer plus the platform actor tenant
    expect((await getPlatformOverview(new Date(), true)).registered).toBe(4);
    await changeCompanyClassification(admin.id, customer.id, "TEST", "Confirmed fixture account");
    expect((await getPlatformOverview()).registered).toBe(1);
    expect((await getPlatformOverview(new Date(), true)).registered).toBe(4);
    expect(await prisma.auditEvent.count({ where: { companyId: customer.id, eventType: "platform_admin.company_classification_changed" } })).toBe(1);
    expect(test.classification).toBe("TEST"); expect(internal.classification).toBe("INTERNAL");
  });

  it("grants, extends, and ends manual trials while paid Stripe access blocks overrides", async () => {
    const admin = await actor(), now = new Date("2026-08-14T12:00:00Z");
    const company = await prisma.company.create({ data: { name: "Trial target" } });
    const granted = await mutateManualTrial(admin.id, company.id, "grant", new Date("2026-08-21T12:00:00Z"), "Extended evaluation", now);
    expect(granted).toMatchObject({ trialStatus: "Active", trialPlan: "Professional" });
    const extended = await mutateManualTrial(admin.id, company.id, "extend", new Date("2026-08-28T12:00:00Z"), "Customer retention", now);
    expect(extended.trialEnd?.toISOString()).toBe("2026-09-04T12:00:00.000Z");
    const ended = await mutateManualTrial(admin.id, company.id, "end", null, "Evaluation complete", now);
    expect(ended).toMatchObject({ trialStatus: "Expired", trialEnd: null });
    expect(await prisma.auditEvent.count({ where: { companyId: company.id, eventType: { in: ["platform_admin.trial_granted", "platform_admin.trial_extended", "platform_admin.trial_ended"] } } })).toBe(3);

    const paid = await prisma.company.create({ data: { name: "Paid target", subscription: { create: { plan: "Starter", status: "Active", stripeSubscriptionId: "sub_paid_guard", lastSuccessfulPaymentAt: now } } } });
    await expect(mutateManualTrial(admin.id, paid.id, "grant", new Date("2026-08-21T12:00:00Z"), "Promotion", now)).rejects.toThrow("paid Stripe subscription");
  });
});
