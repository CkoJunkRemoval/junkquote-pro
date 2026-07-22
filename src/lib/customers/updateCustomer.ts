import { prisma } from "../prisma";
import {recordEstimateEvent}from"../estimates/estimateEvents";

export interface UpdateCustomerInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function updateCustomer(companyId: string, input: UpdateCustomerInput
) {
  const customer = await prisma.customer.findFirst({ where: { id: input.id, companyId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found.");
  const updated=await prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  const estimates=await prisma.estimate.findMany({where:{companyId,customerId:customer.id},select:{id:true}});
  await Promise.all(estimates.map(estimate=>recordEstimateEvent({companyId,estimateId:estimate.id,eventType:"Customer Updated",category:"Customer",actor:{type:"Employee",displayName:"Team member"},summary:"Team member updated customer details",visibility:"Internal",metadata:{customerId:customer.id}})));
  return updated;
}
