import "server-only";
import { prisma } from "@/lib/prisma";
import{queryEstimateEvents}from"@/lib/estimates/estimateEvents";
import { buildPersistedCustomerPricingBreakdown } from "@/data/pricing/livePricingBreakdown";
export async function getPortalDashboard(
  companyId: string,
  customerId: string,
) {
  const now = new Date();
  const [estimates, jobs, invoices, payments, plans,activity] = await Promise.all([
    prisma.estimate.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ["Sent", "Approved", "Scheduled"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        displayNumber: true,
        status: true,
        pricingTotal: true,
        updatedAt: true,
      },
    }),
    prisma.job.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ["Scheduled", "InProgress"] },
        scheduledStart: { gte: now },
      },
      orderBy: { scheduledStart: "asc" },
      take: 10,
      select: {
        id: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        property: { select: { address: true } },
        servicePlanId: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        customerId,
        balanceDue: { gt: 0 },
        status: { notIn: ["Cancelled", "Void"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: {
        id: true,
        displayNumber: true,
        status: true,
        total: true,
        balanceDue: true,
        dueDate: true,
      },
    }),
    prisma.payment.findMany({
      where: { companyId, invoice: { companyId, customerId } },
      orderBy: { paymentDate: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        method: true,
        paymentDate: true,
        invoice: { select: { id: true, displayNumber: true } },
        refunds: { select: { amount: true } },
      },
    }),
    prisma.servicePlan.findMany({
      where: { companyId, customerId, status: { in: ["Active", "Paused"] } },
      orderBy: { nextRunAt: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        nextRunAt: true,
        recurrenceType: true,
        interval: true,
      },
    }),
    queryEstimateEvents(companyId,{audience:"customer",customerId,limit:10}),
  ]);
  return {
    estimates,
    jobs,
    invoices,
    payments,
    plans,
    activity:activity.events,
    outstandingActions: [
      ...estimates
        .filter((x) => x.status === "Sent")
        .map((x) => ({
          type: "estimate",
          label: `Estimate ${x.displayNumber ?? ""} awaits approval`,
          href: `/portal/estimates/${x.id}`,
        })),
      ...invoices.map((x) => ({
        type: "invoice",
        label: `${x.displayNumber ?? "Invoice"} has ${money(x.balanceDue)} due`,
        href: `/portal/invoices/${x.id}`,
      })),
      ...jobs
        .slice(0, 3)
        .map((x) => ({
          type: "job",
          label: `Appointment ${x.scheduledStart?.toLocaleDateString()}`,
          href: `/portal/jobs/${x.id}`,
        })),
    ],
  };
}
export async function listPortalEstimates(
  companyId: string,
  customerId: string,
) {
  return prisma.estimate.findMany({
    where: { companyId, customerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      displayNumber: true,
      status: true,
      pricingSubtotal: true,
      pricingLabor: true,
      pricingDisposal: true,
      pricingDiscount: true,
      pricingTotal: true,
      updatedAt: true,
      approvalToken: true,
      approvalTokenExpiresAt: true,
      signerName: true,
      signedAt: true,
      property: { select: { address: true } },
      jobSites: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              quantity: true,
              priceOverride: true,
            },
          },
        },
      },
    },
  });
}
export async function getPortalEstimate(
  companyId: string,
  customerId: string,
  id: string,
) {
  const estimate=await prisma.estimate.findFirst({
    where: { id, companyId, customerId },
    select: {id:true,displayNumber:true,status:true,pricingSubtotal:true,pricingLabor:true,pricingDisposal:true,pricingDiscount:true,pricingTotal:true,approvalTokenExpiresAt:true,revisionNumber:true,revisionRootId:true,createdAt:true,updatedAt:true,signedAt:true,
      property: {select:{address:true,city:true,state:true,zip:true}},
      pricingProfile:{select:{taxEnabled:true,taxRate:true}},
      appliedPricingRules:{where:{status:"Applied"},orderBy:{displayOrder:"asc"},select:{id:true,name:true,calculatedAmount:true,status:true}},
      jobSites: {
        orderBy: { sortOrder: "asc" },
        select:{id:true,name:true,customerNotes:true,items: { orderBy: { sortOrder: "asc" },select:{id:true,name:true,quantity:true,basePrice:true,priceOverride:true} } },
      },
      revisionPhotos:{where:{customerVisible:true},orderBy:{sortOrder:"asc"},select:{id:true,fileUrl:true,thumbnailUrl:true,fileName:true,caption:true,category:true}},
    },
  });
  if(!estimate)return null;const rootId=estimate.revisionRootId??estimate.id;const revisions=await prisma.estimate.findMany({where:{companyId,customerId,OR:[{id:rootId},{revisionRootId:rootId}]},orderBy:{revisionNumber:"asc"},select:{id:true,displayNumber:true,revisionNumber:true,status:true,createdAt:true}});
  const breakdown=buildPersistedCustomerPricingBreakdown({items:estimate.jobSites.flatMap(site=>site.items),rules:estimate.appliedPricingRules,pricing:{subtotal:estimate.pricingSubtotal,labor:estimate.pricingLabor,disposal:estimate.pricingDisposal,discount:estimate.pricingDiscount,total:estimate.pricingTotal},tax:{enabled:estimate.pricingProfile.taxEnabled,rate:estimate.pricingProfile.taxRate}});
  return{...estimate,breakdown,revisions};
}
export async function listPortalJobs(
  companyId: string,
  customerId: string,
  showCrew = false,
) {
  return prisma.job.findMany({
    where: { companyId, customerId },
    orderBy: { scheduledStart: "desc" },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      arrivalWindowStart: true,
      arrivalWindowEnd: true,
      schedulingStatus: true,
      customerInstructions: true,
      customerNotes: true,
      servicePlan: { select: { name: true } },
      property: {
        select: { address: true, city: true, state: true, zip: true },
      },
      photos: {
        where: { customerVisible: true },
        select: { id: true, category: true, caption: true, fileUrl: true },
      },
      assignments:{where:showCrew?{crewId:{not:null}}:{id:"__hidden__"},select:{crew:{select:{name:true}}}},
    },
  });
}
export async function getPortalJob(
  companyId: string,
  customerId: string,
  id: string,
  showCrew = false,
) {
  return prisma.job.findFirst({
    where: { id, companyId, customerId },
    select: {
      id: true,
      companyId: true,
      customerId: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      arrivalWindowStart: true,
      arrivalWindowEnd: true,
      schedulingStatus: true,
      customerInstructions: true,
      customerNotes: true,
      servicePlan: { select: { name: true } },
      property: {
        select: { address: true, city: true, state: true, zip: true },
      },
      photos: {
        where: { customerVisible: true },
        select: { id: true, category: true, caption: true, fileUrl: true },
      },
      assignments:{where:showCrew?{crewId:{not:null}}:{id:"__hidden__"},select:{crew:{select:{name:true}}}},
    },
  });
}
export async function listPortalInvoices(
  companyId: string,
  customerId: string,
) {
  return prisma.invoice.findMany({
    where: { companyId, customerId },
    orderBy: { createdAt: "desc" },
    select:{id:true,displayNumber:true,status:true,total:true,balanceDue:true,dueDate:true,issuedDate:true,createdAt:true,property:{select:{address:true,city:true,state:true,zip:true}},lineItems:{orderBy:{sortOrder:"asc"},select:{id:true,description:true,quantity:true,unitPrice:true,amount:true}},
      payments: {
        orderBy: { paymentDate: "desc" },
        select:{id:true,amount:true,method:true,paymentDate:true,refunds:{select:{id:true,amount:true}}},
      },
    },
  });
}
export async function getPortalInvoice(
  companyId: string,
  customerId: string,
  id: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, customerId },
    select:{id:true,displayNumber:true,status:true,total:true,balanceDue:true,dueDate:true,issuedDate:true,createdAt:true,property:{select:{address:true,city:true,state:true,zip:true}},lineItems:{orderBy:{sortOrder:"asc"},select:{id:true,description:true,quantity:true,unitPrice:true,amount:true}},
      payments: {
        orderBy: { paymentDate: "desc" },
        select:{id:true,amount:true,method:true,paymentDate:true,refunds:{select:{id:true,amount:true}}},
      },
    },
  });
  if (invoice?.status === "Sent") await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "Viewed", viewedAt: new Date() } });
  return invoice ? { ...invoice, status: invoice.status === "Sent" ? "Viewed" as const : invoice.status } : null;
}
export async function listPortalPayments(
  companyId: string,
  customerId: string,
) {
  return prisma.payment.findMany({
    where: { companyId, invoice: { companyId, customerId } },
    orderBy: { paymentDate: "desc" },
    include: {
      refunds: true,
      invoice: { select: { id: true, displayNumber: true } },
    },
  });
}
export async function listPortalServicePlans(
  companyId: string,
  customerId: string,
) {
  return prisma.servicePlan.findMany({
    where: { companyId, customerId, status: { in: ["Active", "Paused"] } },
    orderBy: { nextRunAt: "asc" },
    include: {
      property: true,
      jobs: {
        orderBy: { servicePlanOccurrence: "desc" },
        take: 3,
        select: { id: true, status: true, servicePlanOccurrence: true },
      },
    },
  });
}
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
