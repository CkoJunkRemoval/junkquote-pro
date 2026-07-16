"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import { createEstimateAction } from "@/app/actions/estimates/createEstimate";
import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

import {
  Estimate,
  Customer,
  Property,
  JobSite,
} from "./types";

import { EstimateStatus } from "./status";

const initialEstimate: Estimate = {
  customerType: null,

  customer: {
    id: "",
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

  status: EstimateStatus.Draft,

  timeline: [],
};

interface EstimateContextType {
  estimate: Estimate;
  estimateId: string | null;

  saveEstimate: () => Promise<void>;

  setEstimate: React.Dispatch<
    React.SetStateAction<Estimate>
  >;

  setCustomerType: (
    customerType: Estimate["customerType"]
  ) => void;

  setCustomer: (
    customer: Customer
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

  setStatus: (
    status: EstimateStatus
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
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const creatingEstimateRef = useRef(false);
  const estimateSelectionRef = useRef<string | null>(null);

  const saveEstimate = useCallback(async () => {
    const customerId = estimate.customer.id;
    const propertyId = estimate.property.id;

    if (!customerId || !propertyId) {
      return;
    }

    const selectionKey = `${customerId}:${propertyId}`;

    if (
      creatingEstimateRef.current ||
      (estimateId && estimateSelectionRef.current === selectionKey)
    ) {
      return;
    }

    creatingEstimateRef.current = true;

    try {
      const createdEstimate = await createEstimateAction({
        companyId: DEVELOPMENT_COMPANY_ID,
        customerId,
        propertyId,
      });

      estimateSelectionRef.current = selectionKey;
      setEstimateId(createdEstimate.id);
    } finally {
      creatingEstimateRef.current = false;
    }
  }, [estimate.customer.id, estimate.property.id, estimateId]);

  useEffect(() => {
    void saveEstimate().catch((error) => {
      console.error("Estimate creation failed:", error);
    });
  }, [saveEstimate]);

  function setCustomerType(
    customerType: Estimate["customerType"]
  ) {
    setEstimate((prev) => ({
      ...prev,
      customerType,
    }));
  }

  function setCustomer(
    customer: Customer
  ) {
    setEstimate((prev) => ({
      ...prev,
      customer,
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

  function setStatus(
    status: EstimateStatus
  ) {
    setEstimate((prev) => ({
      ...prev,
      status,
    }));
  }

  return (
    <EstimateContext.Provider
      value={{
        estimate,
        estimateId,
        saveEstimate,
        setEstimate,
        setCustomerType,
        setCustomer,
        updateCustomer,
        updateProperty,
        setJobSites,
        updatePricing,
        setStatus,
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
