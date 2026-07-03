export type Company = {
  id: string;
  name: string;
  logo?: string;

  accentColor: string;

  ownerName: string;

  businessPhone: string;

  businessEmail: string;

  website?: string;

  serviceArea: string;

  minimumCharge: number;

  trucks: Truck[];
};

export type Truck = {
  id: string;
  name: string;

  capacity: string;

  active: boolean;
};