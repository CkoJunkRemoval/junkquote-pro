"use client";

import { createContext, useContext, useState } from "react";
import { Estimate } from "./types";

const initialEstimate: Estimate = {
  customerType: null,

  customer: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  },

  property: {
    type: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    gateCode: "",
    notes: "",
  },

  jobSites: [],

  items: [],

  pricing: {
    subtotal: 0,
    labor: 0,
    disposal: 0,
    discount: 0,
    total: 0,
  },

  approved: false,
};

type EstimateContextType = {
  estimate: Estimate;
  setEstimate: React.Dispatch<React.SetStateAction<Estimate>>;
};

const EstimateContext =
  createContext<EstimateContextType | null>(null);

export function EstimateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [estimate, setEstimate] =
    useState(initialEstimate);

  return (
    <EstimateContext.Provider
      value={{ estimate, setEstimate }}
    >
      {children}
    </EstimateContext.Provider>
  );
}

export function useEstimate() {
  const context = useContext(EstimateContext);

  if (!context) {
    throw new Error(
      "useEstimate must be used inside EstimateProvider"
    );
  }

  return context;
}