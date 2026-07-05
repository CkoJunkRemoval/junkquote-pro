"use client";

import { useEstimate } from "../EstimateContext";

export default function CustomerStep() {
  const { estimate, setEstimate } = useEstimate();

  function chooseCustomer(type: "existing" | "new") {
    setEstimate({
      ...estimate,
      customerType: type,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-6">

      <button
        type="button"
        onClick={() => chooseCustomer("existing")}
        className={`rounded-2xl border p-8 text-left transition ${
          estimate.customerType === "existing"
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 hover:border-blue-500"
        }`}
      >
        <h2 className="text-2xl font-bold">
          Existing Customer
        </h2>

        <p className="mt-3 text-slate-500">
          Search your customer database.
        </p>

      </button>

      <button
        type="button"
        onClick={() => chooseCustomer("new")}
        className={`rounded-2xl border p-8 text-left transition ${
          estimate.customerType === "new"
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 hover:border-blue-500"
        }`}
      >
        <h2 className="text-2xl font-bold">
          New Customer
        </h2>

        <p className="mt-3 text-slate-500">
          Create a brand new customer.
        </p>

      </button>

    </div>
  );
}