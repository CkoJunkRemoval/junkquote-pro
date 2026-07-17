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
import { loadEstimateAction } from "@/app/actions/estimates/loadEstimate";
import { saveEstimateProgressAction } from "@/app/actions/estimates/saveEstimateProgress";
import { updateEstimateStatusAction } from "@/app/actions/estimates/updateEstimateStatus";
import { calculateEstimate } from "@/data/pricing/calculateEstimate";

import {
  Estimate,
  Customer,
  Property,
  JobSite,
} from "./types";

import { EstimateStatus } from "./status";
import { hydrateDraftEstimate } from "./draftEstimateHydration";

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
  isLoadingEstimate: boolean;
  wizardStep: number;

  saveEstimate: () => Promise<void>;
  resetEstimate: () => void;
  refreshEstimate: () => Promise<void>;
  setWizardStep: (step: number) => void;

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
  ) => Promise<void>;
}

const EstimateContext =
  createContext<EstimateContextType | null>(null);

export function EstimateProvider({
  children,
  initialEstimateId = null,
}: {
  children: ReactNode;
  initialEstimateId?: string | null;
}) {
  const [estimate, setEstimate] =
    useState<Estimate>(initialEstimate);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(
    Boolean(initialEstimateId)
  );
  const [wizardStep, setWizardStepState] = useState(1);
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

  const hydrateEstimate = useCallback(async (id: string) => {
    try {
      const savedEstimate = await loadEstimateAction(id);

      if (!savedEstimate) {
        throw new Error("Draft estimate not found.");
      }

      const restored = hydrateDraftEstimate(savedEstimate);

      estimateSelectionRef.current =
        `${savedEstimate.customerId}:${savedEstimate.propertyId}`;
      setEstimateId(savedEstimate.id);
      setWizardStepState(restored.wizardStep);
      setEstimate(restored.estimate);
    } finally {
      setIsLoadingEstimate(false);
    }
  }, []);

  useEffect(() => {
    if (!initialEstimateId) {
      return;
    }

    void hydrateEstimate(initialEstimateId).catch((error) => {
      console.error("Estimate loading failed:", error);
    });
  }, [hydrateEstimate, initialEstimateId]);

  useEffect(() => {
    if (!estimateId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("junkquote:estimateId", estimateId);
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.set("estimateId", estimateId);
    window.history.replaceState({}, "", url);
  }, [estimateId]);

  const saveDraftProgress = useCallback(async () => {
    if (!estimateId || isLoadingEstimate || estimate.status !== EstimateStatus.Draft) {
      return;
    }

    const totals = calculateEstimate(estimate);
    await saveEstimateProgressAction({
      estimateId,
      currentStep: wizardStep,
      pricingSubtotal: totals.subtotal,
      pricingLabor: totals.labor,
      pricingDisposal: totals.disposalFees,
      pricingDiscount: estimate.pricing.discount,
      pricingTotal: totals.total,
    });
  }, [estimate, estimateId, isLoadingEstimate, wizardStep]);

  useEffect(() => {
    void saveDraftProgress().catch((error) => {
      console.error("Estimate progress saving failed:", error);
    });
  }, [saveDraftProgress]);

  const resetEstimate = useCallback(() => {
    creatingEstimateRef.current = false;
    estimateSelectionRef.current = null;
    setEstimateId(null);
    setWizardStepState(1);
    setEstimate(initialEstimate);
  }, []);

  const refreshEstimate = useCallback(async () => {
    if (!estimateId) return;
    await hydrateEstimate(estimateId);
  }, [estimateId, hydrateEstimate]);

  const setWizardStep = useCallback((step: number) => {
    setWizardStepState(Math.min(6, Math.max(1, step)));
  }, []);

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

  const setJobSites = useCallback((
    jobSites: JobSite[]
  ) => {
    setEstimate((prev) => ({
      ...prev,
      jobSites,
    }));
  }, []);

  function updatePricing(
    pricing: Estimate["pricing"]
  ) {
    setEstimate((prev) => ({
      ...prev,
      pricing,
    }));
  }

  async function setStatus(
    status: EstimateStatus
  ) {
    if (!estimateId) {
      throw new Error("Estimate must be saved before changing status.");
    }

    await updateEstimateStatusAction(estimateId, status);
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
        isLoadingEstimate,
        wizardStep,
        saveEstimate,
        resetEstimate,
        refreshEstimate,
        setWizardStep,
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
