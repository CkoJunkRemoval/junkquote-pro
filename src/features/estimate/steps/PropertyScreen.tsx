"use client";

import { useEffect, useRef, useState } from "react";
import type { Property as CustomerProperty } from "@/generated/prisma/client";

import { createPropertyAction, updatePropertyTypeAction } from "@/app/actions/properties/createProperty";

import { useEstimate } from "../EstimateContext";
import { useCustomers } from "../hooks/useCustomers";

const initialPropertyForm = {
  address: "",
  city: "",
  state: "",
  zip: "",
  gateCode: "",
  accessNotes: "",
  propertyType: "",
};

export default function PropertyStep() {
  const { estimate, setEstimate } = useEstimate();
  const { getProperties } = useCustomers();
  const [properties, setProperties] = useState<CustomerProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] =
    useState<string | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyForm, setPropertyForm] = useState(initialPropertyForm);
  const [propertyFormError, setPropertyFormError] = useState("");
  const [propertySaveSuccess, setPropertySaveSuccess] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const getPropertiesRef = useRef(getProperties);
  const firstPropertyInputRef = useRef<HTMLInputElement | null>(null);
  const selectedPropertyRef = useRef<HTMLButtonElement | null>(null);
  const scrollToSelectedPropertyRef = useRef(false);

  const customerId = estimate.customer.id;

  useEffect(() => {
    getPropertiesRef.current = getProperties;
  }, [getProperties]);

  useEffect(() => {
    if (showPropertyForm) {
      firstPropertyInputRef.current?.focus();
    }
  }, [showPropertyForm]);

  useEffect(() => {
    if (scrollToSelectedPropertyRef.current && selectedPropertyId) {
      selectedPropertyRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      scrollToSelectedPropertyRef.current = false;
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (!propertySaveSuccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPropertySaveSuccess("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [propertySaveSuccess]);

  function selectProperty(property: CustomerProperty) {
    if (property.id === selectedPropertyId) {
      return;
    }

    setSelectedPropertyId(property.id);
    setEstimate((previousEstimate) => ({
      ...previousEstimate,
      property: {
        id: property.id,
        type: (property.propertyType ?? "") as typeof previousEstimate.property.type,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        gateCode: property.gateCode ?? "",
        notes: property.accessNotes ?? "",
      },
    }));
  }

  async function handleCreateProperty() {
    if (!customerId) {
      setPropertyFormError("Select a customer first.");
      return;
    }

    if (
      !propertyForm.address.trim() ||
      !propertyForm.city.trim() ||
      !propertyForm.state.trim() ||
      !propertyForm.zip.trim()
    ) {
      setPropertyFormError(
        "Address, city, state, and ZIP are required."
      );
      return;
    }

    setPropertyFormError("");
    setPropertySaveSuccess("");
    setSavingProperty(true);

    try {
      const createdProperty = await createPropertyAction({
        customerId,
        ...propertyForm,
      });
      const updatedProperties = await getPropertiesRef.current(customerId);

      setProperties(updatedProperties);
      scrollToSelectedPropertyRef.current = true;
      selectProperty(
        updatedProperties.find(
          (property) => property.id === createdProperty.id
        ) ?? createdProperty
      );
      setPropertyForm(initialPropertyForm);
      setShowPropertyForm(false);
      setPropertySaveSuccess("Property Saved");
    } catch (error) {
      setPropertyFormError(
        error instanceof Error
          ? error.message
          : "Unable to save property."
      );
    } finally {
      setSavingProperty(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;

    if (!customerId) {
      return;
    }

    Promise.resolve()
      .then(() => {
        if (!isCurrent) {
          return [];
        }

        setLoadingProperties(true);
        setSelectedPropertyId(null);
        setEstimate((previousEstimate) => ({
          ...previousEstimate,
          property: {
            id: "",
            type: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            gateCode: "",
            notes: "",
          },
        }));

        return getPropertiesRef.current(customerId);
      })
      .then((results) => {
        if (!isCurrent) {
          return;
        }

        setProperties(results);

        if (results.length === 1) {
          const property = results[0];

          setSelectedPropertyId(property.id);
          setEstimate((previousEstimate) => ({
            ...previousEstimate,
            property: {
              id: property.id,
              type: (property.propertyType ?? "") as typeof previousEstimate.property.type,
              address: property.address,
              city: property.city,
              state: property.state,
              zip: property.zip,
              gateCode: property.gateCode ?? "",
              notes: property.accessNotes ?? "",
            },
          }));
        }
      })
      .catch((error) => {
        if (isCurrent) {
          console.error("Property loading failed:", error);
          setProperties([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoadingProperties(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [customerId, setEstimate]);

  if (!customerId) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold">
          Where are we working today?
        </h2>

        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Select a customer first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">
          Where are we working today?
        </h2>

        <p className="mt-2 text-slate-500">
          Select a saved property for this customer.
        </p>
      </div>

      {loadingProperties && (
        <p className="text-slate-500">
          Loading properties...
        </p>
      )}

      {!loadingProperties && properties.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-xl font-semibold">
            No properties found.
          </p>
        </div>
      )}

      {!loadingProperties && (
        <div className={properties.length > 0 ? "space-y-4" : ""}>
          {!showPropertyForm && (
            <button
              type="button"
              onClick={() => setShowPropertyForm(true)}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              {properties.length > 0
                ? "Add Another Property"
                : "Create Property"}
            </button>
          )}

          {showPropertyForm && (
            <div className="space-y-4 rounded-2xl border border-slate-300 p-6 text-left">
              <input
                ref={firstPropertyInputRef}
                type="text"
                placeholder="Address *"
                value={propertyForm.address}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                disabled={savingProperty}
                className="w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
              />

              <select value={propertyForm.propertyType} onChange={(event) => setPropertyForm((current) => ({ ...current, propertyType: event.target.value }))} className="w-full rounded-xl border border-slate-300 p-3" required><option value="">Property type *</option><option value="house">House</option><option value="apartment">Apartment</option><option value="condo">Condo</option><option value="commercial">Commercial</option><option value="storage">Storage</option><option value="other">Other</option></select>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="City *"
                  value={propertyForm.city}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  disabled={savingProperty}
                  className="rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  placeholder="State *"
                  value={propertyForm.state}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                  disabled={savingProperty}
                  className="rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />

                <input
                  type="text"
                  placeholder="ZIP *"
                  value={propertyForm.zip}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      zip: event.target.value,
                    }))
                  }
                  disabled={savingProperty}
                  className="rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />
              </div>

              <input
                type="text"
                placeholder="Gate Code"
                value={propertyForm.gateCode}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    gateCode: event.target.value,
                  }))
                }
                disabled={savingProperty}
                className="w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
              />

              <textarea
                placeholder="Access Notes"
                value={propertyForm.accessNotes}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    accessNotes: event.target.value,
                  }))
                }
                disabled={savingProperty}
                className="min-h-24 w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
              />

              {propertyFormError && (
                <p className="text-sm text-red-600">
                  {propertyFormError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateProperty}
                disabled={savingProperty}
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {savingProperty ? "Saving..." : "Save Property"}
              </button>
            </div>
          )}
        </div>
      )}

      {propertySaveSuccess && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          {propertySaveSuccess}
        </p>
      )}

      {!loadingProperties && properties.length > 0 && (
        <div className="space-y-3">
          {properties.map((property) => {
            const isSelected = property.id === selectedPropertyId;

            return (
              <button
                key={property.id}
                type="button"
                ref={isSelected ? selectedPropertyRef : null}
                onClick={() => selectProperty(property)}
                disabled={isSelected}
                className={`w-full rounded-2xl border p-6 text-left transition ${
                  isSelected
                    ? "cursor-not-allowed border-blue-600 bg-blue-50"
                    : "border-slate-300 hover:border-blue-500 hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold">
                  {property.address}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {property.city}, {property.state} {property.zip}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {selectedPropertyId && <label className="grid gap-1 text-sm font-medium">Property type<select value={estimate.property.type} onChange={(event) => { const propertyType = event.target.value as typeof estimate.property.type; setEstimate((current) => ({ ...current, property: { ...current.property, type: propertyType } })); void updatePropertyTypeAction(selectedPropertyId, propertyType || null).then(() => setProperties((current) => current.map((property) => property.id === selectedPropertyId ? { ...property, propertyType: propertyType || null } : property))); }} className="rounded-xl border p-3"><option value="">Select type</option><option value="house">House</option><option value="apartment">Apartment</option><option value="condo">Condo</option><option value="commercial">Commercial</option><option value="storage">Storage</option><option value="other">Other</option></select></label>}
    </div>
  );
}
