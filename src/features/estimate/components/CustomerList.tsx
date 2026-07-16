"use client";

import type { Customer } from "@/generated/prisma/client";

interface CustomerListProps {
  customers: Customer[];
  onSelect(customer: Customer): void;
}

export default function CustomerList({
  customers,
  onSelect,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-300 p-6 text-center text-slate-500">
        No customers found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onSelect(customer)}
          className="w-full rounded-xl border border-slate-300 p-4 text-left transition hover:border-blue-500 hover:bg-slate-50"
        >
          <div className="font-semibold">
            {customer.firstName} {customer.lastName}
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
