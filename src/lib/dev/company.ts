import { prisma } from "../prisma";

export async function getDevelopmentCompany() {
  let company = await prisma.company.findFirst({
    where: {
      name: "CKO Junk Removal",
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "CKO Junk Removal",
        phone: "804-586-6642",
        email: "CKOJunkRemoval@gmail.com",
        website: "",
      },
    });

    await prisma.companySettings.create({
      data: {
        companyId: company.id,
      },
    });
    await prisma.pricingProfile.create({
      data: {
        companyId: company.id,
        name: "Standard",
        description: "Default company pricing",
        defaultProfile: true,
        minimumCharge: company.defaultMinimumCharge,
      },
    });
  }

  return company;
}
