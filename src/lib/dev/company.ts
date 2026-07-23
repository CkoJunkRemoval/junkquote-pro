import { prisma } from "../prisma";
import { DEFAULT_ITEM_LIBRARY, standardItemId } from "../itemLibrary/defaultItems";

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
    await prisma.itemLibrary.createMany({
      data: DEFAULT_ITEM_LIBRARY.map((item) => ({
        companyId: company!.id,
        id: standardItemId(company!.id, item),
        ...item,
        estimateRequired: item.estimateRequired ?? false,
      })),
    });
  }

  return company;
}
