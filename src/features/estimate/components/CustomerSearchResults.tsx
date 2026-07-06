"use client";

import { Customer } from "@/generated/prisma";

interface Props {
  customers: Customer[];

  onSelect(customer: Customer): void;
}

export default function CustomerSearchResults({
  customers,
  onSelect,
}: Props) {
  if (customers.length === 0) {
    return (
      <p className="text-slate-500">
        No customers found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onSelect(customer)}
          className="w-full rounded-xl border border-slate-300 p-4 text-left hover:border-blue-500"
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
      ))}
    </div>
  );
}