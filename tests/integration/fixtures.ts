import { prisma } from "@/lib/prisma";

export async function resetIntegrationDatabase() { await prisma.company.deleteMany(); }

async function createTenant(label: "A" | "B", invoiceNumber: number) {
  const company = await prisma.company.create({ data: { name: `Company ${label}`, displayName: `Company ${label}` } });
  const user = await prisma.user.create({ data: { companyId: company.id, email: `owner-${label.toLowerCase()}@test.invalid`, passwordHash: "integration-only", role: "OWNER", firstName: "Owner", lastName: label } });
  const ownerMembership = await prisma.companyMembership.create({ data: { userId: user.id, companyId: company.id, role: "Owner" } });
  const officeUser = await prisma.user.create({ data: { companyId: company.id, email: `office-${label.toLowerCase()}@test.invalid`, passwordHash: "integration-only", role: "OFFICE" } });
  const officeMembership = await prisma.companyMembership.create({ data: { userId: officeUser.id, companyId: company.id, role: "Office" } });
  const crewUser = await prisma.user.create({ data: { companyId: company.id, email: `crew-${label.toLowerCase()}@test.invalid`, passwordHash: "integration-only", role: "CREW_MEMBER" } });
  const crewMembership = await prisma.companyMembership.create({ data: { userId: crewUser.id, companyId: company.id, role: "Crew" } });
  const suspendedUser = await prisma.user.create({ data: { companyId: company.id, email: `suspended-${label.toLowerCase()}@test.invalid`, passwordHash: "integration-only", role: "OFFICE" } });
  const suspendedMembership = await prisma.companyMembership.create({ data: { userId: suspendedUser.id, companyId: company.id, role: "Office", status: "Suspended" } });
  const customer = await prisma.customer.create({ data: { companyId: company.id, firstName: "Customer", lastName: label, phone: "555-0100" } });
  const property = await prisma.property.create({ data: { customerId: customer.id, address: `${label} Main St`, city: "Testville", state: "NY", zip: "10001" } });
  const estimate = await prisma.estimate.create({ data: { companyId: company.id, customerId: customer.id, propertyId: property.id, status: "Approved", pricingTotal: 100 } });
  const job = await prisma.job.create({ data: { companyId: company.id, estimateId: estimate.id, customerId: customer.id, propertyId: property.id } });
  const invoice = await prisma.invoice.create({ data: { companyId: company.id, customerId: customer.id, propertyId: property.id, estimateId: estimate.id, jobId: job.id, invoiceNumber, subtotal: 100, total: 100, balanceDue: 75, status: "Partial" } });
  const payment = await prisma.payment.create({ data: { companyId: company.id, invoiceId: invoice.id, amount: 25, method: "Cash", paymentDate: new Date() } });
  const employee = await prisma.employee.create({ data: { companyId: company.id, firstName: "Employee", lastName: label, role: "CrewMember" } });
  const crew = await prisma.crew.create({ data: { companyId: company.id, name: `Crew ${label}` } });
  const photo = await prisma.jobPhoto.create({ data: { companyId: company.id, jobId: job.id, category: "Before", fileUrl: `/api/private/assets/job-photos/${company.id}/${job.id}/photo.jpg`, fileName: "photo.jpg", mimeType: "image/jpeg", fileSize: 10, sortOrder: 0 } });
  return { company, user, ownerMembership, officeMembership, crewMembership, suspendedMembership, customer, property, estimate, job, invoice, payment, employee, crew, photo };
}

export async function createTenantFixtures() { return { a: await createTenant("A", 91001), b: await createTenant("B", 92001) }; }
