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
import { changeEstimatePricingProfileAction } from "@/app/actions/pricingProfiles/pricingProfiles";
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
  pricingProfileId: "",
  pricingProfileName: "",
  pricingDefaults: {
    minimumCharge: 0,
    tripFee: 0,
    laborRate: 0,
    dumpFee: 0,
    mileageRate: 0,
    fuelSurcharge: 0,
    defaultCrewSize: 1,
    taxEnabled: false,
    taxRate: 0,
    currency: "USD",
  },
  pricingManuallyEdited: false,
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

  changePricingProfile: (profile: {
    id: string;
    name: string;
    minimumCharge: number;
    tripFee: number;
    laborRate: number;
    dumpFee: number;
    mileageRate: number;
    fuelSurcharge: number;
    defaultCrewSize: number;
    taxEnabled: boolean;
    taxRate: number;
    currency: string;
  }) => Promise<void>;

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
      setEstimate((previous) => ({
        ...previous,
        pricingProfileId: createdEstimate.pricingProfileId,
        pricingProfileName: createdEstimate.pricingProfile.name,
        pricingDefaults: {
          minimumCharge: createdEstimate.pricingProfile.minimumCharge,
          tripFee: createdEstimate.pricingProfile.tripFee,
          laborRate: createdEstimate.pricingProfile.laborRate,
          dumpFee: createdEstimate.pricingProfile.dumpFee,
          mileageRate: createdEstimate.pricingProfile.mileageRate,
          fuelSurcharge: createdEstimate.pricingProfile.fuelSurcharge,
          defaultCrewSize: createdEstimate.pricingProfile.defaultCrewSize,
          taxEnabled: createdEstimate.pricingProfile.taxEnabled,
          taxRate: createdEstimate.pricingProfile.taxRate,
          currency: createdEstimate.pricingProfile.currency,
        },
      }));
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
    if (!estimateId || isLoadingEstimate || estimate.status === EstimateStatus.Approved) {
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
      estimatedLaborHours: Number.isFinite(totals.laborHours) ? totals.laborHours : null,
      estimatedLaborCost: Number.isFinite(totals.labor) ? totals.labor : null,
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
      pricingManuallyEdited: true,
    }));
  }

  async function changePricingProfile(profile: Parameters<EstimateContextType["changePricingProfile"]>[0]) {
    if (!estimateId) throw new Error("Save the estimate before changing its pricing profile.");
    await changeEstimatePricingProfileAction(estimateId, profile.id);
    setEstimate((previous) => {
      const next = {
        ...previous,
        pricingProfileId: profile.id,
        pricingProfileName: profile.name,
        pricingDefaults: {
          minimumCharge: profile.minimumCharge,
          tripFee: profile.tripFee,
          laborRate: profile.laborRate,
          dumpFee: profile.dumpFee,
          mileageRate: profile.mileageRate,
          fuelSurcharge: profile.fuelSurcharge,
          defaultCrewSize: profile.defaultCrewSize,
          taxEnabled: profile.taxEnabled,
          taxRate: profile.taxRate,
          currency: profile.currency,
        },
        pricingManuallyEdited: false,
      };
      const totals = calculateEstimate(next);
      return {
        ...next,
        pricing: {
          subtotal: totals.subtotal,
          labor: totals.labor,
          disposal: totals.disposalFees,
          discount: next.pricing.discount,
          total: totals.total,
        },
      };
    });
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
        changePricingProfile,
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
