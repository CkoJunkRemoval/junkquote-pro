import { prisma } from "../prisma";
import { randomUUID } from "node:crypto";

export interface CreateEstimateInput {
  customerId: string;
  propertyId: string;
}

export async function createEstimate(companyId: string, input: CreateEstimateInput) {
  const [company, customer, property] = await Promise.all([prisma.company.findFirst({ where: { id: companyId }, select: { estimatePrefix: true } }), prisma.customer.findFirst({ where: { id: input.customerId, companyId }, select: { id: true } }), prisma.property.findFirst({ where: { id: input.propertyId, customer: { companyId } }, select: { id: true, customerId: true } })]);
  if (!company) throw new Error("Company not found.");
  if (!customer || !property || property.customerId !== customer.id) throw new Error("Customer or property not found.");
  return prisma.estimate.create({
    data: {
      companyId,
      customerId: input.customerId,
      propertyId: input.propertyId,
      displayNumber: `${company.estimatePrefix}-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
  });
}
