"use client";

import { useEstimate } from "../EstimateContext";

export default function CustomerStep() {
  const {
    estimate,
    setCustomerType,
    updateCustomer,
  } = useEstimate();

  function handleCustomerType(
    type: "existing" | "new"
  ) {
    setCustomerType(type);
  }

  return (
    <div className="space-y-8">

      <div>

        <h2 className="text-3xl font-bold">
          Customer Information
        </h2>

        <p className="mt-2 text-slate-500">
          Select the customer type and enter their information.
        </p>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <button
          type="button"
          onClick={() =>
            handleCustomerType("existing")
          }
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
            Search your customer database
            (coming soon).
          </p>

        </button>

        <button
          type="button"
          onClick={() =>
            handleCustomerType("new")
          }
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

    </div>
  );
}