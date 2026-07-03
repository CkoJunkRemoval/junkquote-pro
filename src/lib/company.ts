import { Company } from "@/types/company";

export const company: Company = {
  id: "1",

  name: "CKO Junk Removal",

  accentColor: "#2563eb",

  ownerName: "Chris",

  businessPhone: "(804) 586-6642",

  businessEmail: "ckojunkremoval@gmail.com",

  serviceArea: "Richmond, VA",

  minimumCharge: 125,

  trucks: [
    {
      id: "1",
      name: "Truck 1",
      capacity: "Pickup",
      active: true,
    },
  ],
};