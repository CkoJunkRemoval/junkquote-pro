"use client";

import { useState } from "react";
import type { Customer } from "@/generated/prisma/client";

import Button from "@/components/ui/Button";

import { useEstimate } from "../EstimateContext";
import { useCustomers } from "../hooks/useCustomers";

export default function CustomerStep() {
  const {
    estimate,
    setCustomerType,
    setCustomer,
    updateCustomer,
  } = useEstimate();

  const {
    customers,
    loading,
    search,
    create,
    clearCustomers,
  } = useCustomers();

  const [searchText, setSearchText] = useState("");
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomerId, setSavedCustomerId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  function handleCustomerType(
    type: "existing" | "new"
  ) {
    if (type !== estimate.customerType) {
      setSaveSuccess("");
      setSaveError("");
      setSavedCustomerId(null);
      setSearchText("");
      setHasSubmittedSearch(false);
      setSelectedCustomerId(null);
      clearCustomers();
      setCustomer({
        id: "",
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
      });
    }

    setCustomerType(type);
  }

  async function handleSearch() {
    setHasSubmittedSearch(true);
    await search(searchText);
  }

  async function handleCreateCustomer() {
    if (savingCustomer || savedCustomerId) {
      return;
    }

    setSaveSuccess("");
    setSaveError("");
    setSavingCustomer(true);

    try {
      const customer = await create({
        firstName: estimate.customer.firstName,
        lastName: estimate.customer.lastName,
        phone: estimate.customer.phone,
        email: estimate.customer.email,
      });

      setCustomer({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email ?? "",
      });
      setSavedCustomerId(customer.id);
      setSaveSuccess("Customer saved successfully.");
    } catch (error) {
      console.error("Customer creation failed:", error);
      setSaveError("Unable to save customer. Please try again.");
    } finally {
      setSavingCustomer(false);
    }
  }

  function selectCustomer(customer: Customer) {
    if (customer.id === selectedCustomerId) {
      return;
    }

    setCustomer({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email ?? "",
    });
    setSelectedCustomerId(customer.id);
  }

  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-3xl font-bold">
          Customer Information
        </h2>

        <p className="mt-2 text-slate-500">
          Select an existing customer or create a new one.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <button
          type="button"
          onClick={() => handleCustomerType("existing")}
          className={`rounded-2xl border p-6 text-left transition ${
            estimate.customerType === "existing"
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 hover:border-blue-500"
          }`}
        >
          <h3 className="text-xl font-bold">
            Existing Customer
          </h3>

          <p className="mt-2 text-slate-500">
            Search your customer database.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleCustomerType("new")}
          className={`rounded-2xl border p-6 text-left transition ${
            estimate.customerType === "new"
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 hover:border-blue-500"
          }`}
        >
          <h3 className="text-xl font-bold">
            New Customer
          </h3>

          <p className="mt-2 text-slate-500">
            Create a new customer.
          </p>
        </button>

      </div>

      {estimate.customerType === "existing" && (

        <div className="space-y-4">

          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setHasSubmittedSearch(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchText.trim() && !loading) {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Search by name or phone..."
            className="w-full rounded-xl border border-slate-300 p-3"
          />

          <Button
            type="button"
            onClick={handleSearch}
            disabled={loading || !searchText.trim()}
          >
            Search
          </Button>

          {loading && (
            <p className="text-slate-500">
              Searching...
            </p>
          )}

          {!loading &&
            hasSubmittedSearch &&
            customers.length === 0 &&
            (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No customers found.
              </div>
            )}

          {customers.length > 0 && (

            <div className="space-y-3">

              {selectedCustomerId && (
                <p className="text-sm font-medium text-green-600">
                  Customer Selected
                </p>
              )}

              {customers.map((customer) => {
                const isSelected = customer.id === selectedCustomerId;

                return (

                  <button
                    key={customer.id}
                    type="button"
                    onClick={() =>
                      selectCustomer(customer)
                    }
                    disabled={isSelected}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "cursor-not-allowed border-blue-600 bg-blue-50"
                        : "border-slate-300 hover:border-blue-600 hover:bg-slate-50"
                    }`}
                  >

                    <div className="font-semibold">
                      {customer.firstName}{" "}
                      {customer.lastName}
                    </div>

                    <div className="text-sm text-slate-500">
                      {customer.phone}
                    </div>

                    {customer.email && (
                      <div className="text-sm text-slate-500">
                        {customer.email}
                      </div>
                    )}

                  </button>

                );
              })}

            </div>

          )}

        </div>

      )}

      {estimate.customerType === "new" && (

        <div className="space-y-6">

          <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="mb-2 block font-medium">
              First Name
            </label>

            <input
              type="text"
              value={estimate.customer.firstName}
              onChange={(e) =>
                updateCustomer({
                  firstName: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Last Name
            </label>

            <input
              type="text"
              value={estimate.customer.lastName}
              onChange={(e) =>
                updateCustomer({
                  lastName: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Phone Number
            </label>

            <input
              type="tel"
              value={estimate.customer.phone}
              onChange={(e) =>
                updateCustomer({
                  phone: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Email Address
            </label>

            <input
              type="email"
              value={estimate.customer.email}
              onChange={(e) =>
                updateCustomer({
                  email: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleCreateCustomer}
              disabled={savingCustomer || Boolean(savedCustomerId)}
            >
              {savingCustomer
                ? "Saving Customer..."
                : savedCustomerId
                  ? "Customer Saved"
                  : "Save New Customer"}
            </Button>

            {saveSuccess && (
              <p className="text-sm text-green-600">
                {saveSuccess}
              </p>
            )}

            {saveError && (
              <p className="text-sm text-red-600">
                {saveError}
              </p>
            )}
          </div>
        </div>

      )}

    </div>
  );
}
