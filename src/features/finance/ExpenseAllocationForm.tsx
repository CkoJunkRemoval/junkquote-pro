"use client";

import { useState } from "react";
import { allocateExpenseAction } from "@/app/actions/finance/finance";
import { financeField } from "./FinanceShell";

type Option = { id: string; label: string };
type Kind =
  | "Job"
  | "Employee"
  | "Vehicle"
  | "Trailer"
  | "Equipment"
  | "Customer"
  | "Crew";

export default function ExpenseAllocationForm({
  expenseId,
  remainingCents,
  options,
}: {
  expenseId: string;
  remainingCents: number;
  options: Record<Kind, Option[]>;
}) {
  const [kind, setKind] = useState<Kind>("Job");
  const targetType = ["Vehicle", "Trailer", "Equipment"].includes(kind)
    ? "Asset"
    : kind;
  return (
    <form action={allocateExpenseAction} className="mt-4 grid gap-3">
      <input type="hidden" name="expenseId" value={expenseId} />
      <input type="hidden" name="targetType" value={targetType} />
      <label>
        <span className="mb-1 block text-sm text-slate-300">Target type</span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as Kind)}
          className={financeField}
        >
          {Object.keys(options).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm text-slate-300">{kind}</span>
        <select required name="targetId" className={financeField} key={kind}>
          <option value="">Choose {kind.toLowerCase()}</option>
          {options[kind].map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm text-slate-300">
          Amount · maximum ${(remainingCents / 100).toFixed(2)}
        </span>
        <input
          required
          name="amount"
          type="number"
          min=".01"
          max={(remainingCents / 100).toFixed(2)}
          step=".01"
          className={financeField}
        />
      </label>
      <button className="ui-button ui-button--secondary min-h-11 rounded-xl px-4 font-semibold">
        Add allocation
      </button>
    </form>
  );
}
