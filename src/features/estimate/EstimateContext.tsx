"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

import {
  Estimate,
  Customer,
  Property,
  JobSite,
} from "./types";

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

  pricing: {
    subtotal: 0,
    labor: 0,
    disposal: 0,
    discount: 0,
    total: 0,
  },

  approved: false,
};

interface EstimateContextType {
  estimate: Estimate;

  // Temporary compatibility for existing screens
  setEstimate: React.Dispatch<
    React.SetStateAction<Estimate>
  >;

  // New API
  setCustomerType: (
    customerType: Estimate["customerType"]
  ) => void;

  updateCustomer: (
    customer: Partial<Customer>
  ) => void;

  updateProperty: (
    property: Partial<Property>
  ) => void;

  setJobSites: (
    jobSites: JobSite[]
  ) => void;

  updatePricing: (
    pricing: Estimate["pricing"]
  ) => void;

  setApproved: (
    approved: boolean
  ) => void;
}

const EstimateContext =
  createContext<EstimateContextType | null>(null);

export function EstimateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [estimate, setEstimate] =
    useState<Estimate>(initialEstimate);

  function setCustomerType(
    customerType: Estimate["customerType"]
  ) {
    setEstimate((prev) => ({
      ...prev,
      customerType,
    }));
  }

  function updateCustomer(
    customer: Partial<Customer>
  ) {
    setEstimate((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        ...customer,
      },
    }));
  }

  function updateProperty(
    property: Partial<Property>
  ) {
    setEstimate((prev) => ({
      ...prev,
      property: {
        ...prev.property,
        ...property,
      },
    }));
  }

  function setJobSites(
    jobSites: JobSite[]
  ) {
    setEstimate((prev) => ({
      ...prev,
      jobSites,
    }));
  }

  function updatePricing(
    pricing: Estimate["pricing"]
  ) {
    setEstimate((prev) => ({
      ...prev,
      pricing,
    }));
  }

  function setApproved(
    approved: boolean
  ) {
    setEstimate((prev) => ({
      ...prev,
      approved,
    }));
  }

  return (
    <EstimateContext.Provider
      value={{
        estimate,
        setEstimate,

        setCustomerType,
        updateCustomer,
        updateProperty,
        setJobSites,
        updatePricing,
        setApproved,
      }}
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