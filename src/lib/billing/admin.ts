import{prisma}from"@/lib/prisma";
export async function listCompanyBillingAdmin(){return prisma.companySubscription.findMany({orderBy:{updatedAt:"desc"},select:{company:{select:{id:true,name:true}},plan:true,status:true,trialEnd:true,currentPeriodEnd:true,stripeCustomerId:true,stripeSubscriptionId:true}})}
