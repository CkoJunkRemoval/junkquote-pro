import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import { getCustomerDetail } from "@/lib/customers/getCustomerDetail";
import { updateCustomer } from "@/lib/customers/updateCustomer";
import { createEstimate } from "@/lib/estimates/createEstimate";
import { deleteEstimate } from "@/lib/estimates/deleteEstimate";
import { getEstimate } from "@/lib/estimates/getEstimate";
import { updateEstimateStatus } from "@/lib/estimates/updateEstimateStatus";
import { createJobFromEstimate } from "@/lib/jobs/createJobFromEstimate";
import { getJobDetail } from "@/lib/jobs/getJobDetail";
import { updateJob } from "@/lib/jobs/updateJob";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { recordPayment } from "@/lib/payments/paymentMutations";
import { recordRefund } from "@/lib/payments/refunds";
import { assignEmployeeToJob } from "@/lib/crews/assignments";
import { getCrew, getEmployee, updateCrew, updateEmployee } from "@/lib/crews/management";
import { deleteJobPhoto, listJobPhotos, updateJobPhoto } from "@/lib/jobPhotos/jobPhotos";
import { getCompanyBranding, updateCompanyBranding } from "@/lib/company/branding";
import { resolveActiveMembership } from "@/lib/auth/tenant";
import { getSignedPublicEstimatePdf } from "@/lib/estimates/getSignedPublicEstimatePdf";

describe("real database tenant isolation", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(async () => { await resetIntegrationDatabase(); });

  it("isolates customer reads and updates", async () => { const { a, b } = await createTenantFixtures(); expect(await getCustomerDetail(a.company.id, b.customer.id)).toBeNull(); await expect(updateCustomer(a.company.id, { id: b.customer.id, firstName: "X", lastName: "Y", phone: "1" })).rejects.toThrow("Customer not found"); });
  it("isolates estimate reads, updates, deletes, and customer/property pairing", async () => { const { a, b } = await createTenantFixtures(); expect(await getEstimate(a.company.id, b.estimate.id)).toBeNull(); await expect(updateEstimateStatus(a.company.id, b.estimate.id, "Sent")).rejects.toThrow(); await expect(deleteEstimate(a.company.id, b.estimate.id)).rejects.toThrow(); await expect(createEstimate(a.company.id, { customerId: a.customer.id, propertyId: b.property.id })).rejects.toThrow("Customer or property not found"); });
  it("isolates jobs and conversion from estimates", async () => { const { a, b } = await createTenantFixtures(); expect(await getJobDetail(a.company.id, b.job.id)).toBeNull(); await expect(updateJob(a.company.id, { id: b.job.id, crewNotes: "cross tenant" })).rejects.toThrow("Job not found"); await expect(createJobFromEstimate(a.company.id, b.estimate.id)).rejects.toThrow("Estimate not found"); });
  it("isolates invoices, payment recording, and refunds", async () => { const { a, b } = await createTenantFixtures(); expect(await getInvoiceDetail(a.company.id, b.invoice.id)).toBeNull(); await expect(recordPayment(a.company.id, b.invoice.id, { amount: 5, method: "Cash", paymentDate: new Date() })).rejects.toThrow("Invoice not found"); await expect(recordRefund(a.company.id, b.payment.id, { amount: 5, refundedAt: new Date(), createdByUserId: a.user.id })).rejects.toThrow("Payment not found"); });
  it("isolates employees, crews, and assignments", async () => { const { a, b } = await createTenantFixtures(); expect(await getEmployee(a.company.id, b.employee.id)).toBeNull(); expect(await getCrew(a.company.id, b.crew.id)).toBeNull(); await expect(updateEmployee(a.company.id, b.employee.id, { firstName: "X", lastName: "Y", role: "CrewMember" })).rejects.toThrow("Employee not found"); await expect(updateCrew(a.company.id, b.crew.id, { name: "X" })).rejects.toThrow("Crew not found"); await expect(assignEmployeeToJob(a.company.id, a.job.id, b.employee.id)).rejects.toThrow("not found"); });
  it("isolates job photo reads, updates, and deletes", async () => { const { a, b } = await createTenantFixtures(); await expect(listJobPhotos(a.company.id, b.job.id)).rejects.toThrow("Job not found"); await expect(updateJobPhoto(a.company.id, b.photo.id, { caption: "cross tenant" })).rejects.toThrow("Photo not found"); await expect(deleteJobPhoto(a.company.id, b.photo.id)).rejects.toThrow("Photo not found"); });
  it("isolates company settings and suspended memberships", async () => { const { a, b } = await createTenantFixtures(); expect((await getCompanyBranding(a.company.id)).id).toBe(a.company.id); await updateCompanyBranding(a.company.id, { displayName: "A Updated" }); expect((await getCompanyBranding(b.company.id)).displayName).toBe("Company B"); expect(await resolveActiveMembership(b.suspendedMembership.userId)).toBeNull(); });
  it("authorizes signed documents by valid approval token and rejects invalid or expired tokens", async () => { const { a } = await createTenantFixtures(); const token = "integration-valid-token"; await prisma.estimate.update({ where: { id: a.estimate.id }, data: { approvalToken: token, approvalTokenExpiresAt: new Date(Date.now() + 60_000), signatureData: "data:image/png;base64,eA==", signerName: "Signer", signedAt: new Date(), signatureMethod: "PublicLink" } }); expect((await getSignedPublicEstimatePdf(token)).status).toBe("Approved"); await expect(getSignedPublicEstimatePdf("invalid-token")).rejects.toThrow(); await prisma.estimate.update({ where: { id: a.estimate.id }, data: { approvalTokenExpiresAt: new Date(Date.now() - 60_000) } }); await expect(getSignedPublicEstimatePdf(token)).rejects.toThrow(); });
});
