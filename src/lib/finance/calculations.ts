export type ExpenseComponents = {
  subtotalCents: number;
  taxCents?: number;
  tipCents?: number;
  feeCents?: number;
  totalCents: number;
};

export function validateExpenseComponents(input: ExpenseComponents) {
  const values = [
    input.subtotalCents,
    input.taxCents ?? 0,
    input.tipCents ?? 0,
    input.feeCents ?? 0,
    input.totalCents,
  ];
  if (!values.every(Number.isSafeInteger) || values.some((value) => value < 0)) {
    throw new Error("Expense amounts must be non-negative whole cents.");
  }
  const calculated =
    input.subtotalCents +
    (input.taxCents ?? 0) +
    (input.tipCents ?? 0) +
    (input.feeCents ?? 0);
  if (calculated !== input.totalCents) {
    throw new Error("Expense components must equal the total.");
  }
}

export function validateAllocationTotal(
  expenseTotalCents: number,
  allocations: number[],
) {
  if (
    allocations.some(
      (amount) => !Number.isSafeInteger(amount) || amount <= 0,
    )
  ) {
    throw new Error("Allocation amounts must be positive whole cents.");
  }
  const allocatedCents = allocations.reduce((sum, amount) => sum + amount, 0);
  if (allocatedCents > expenseTotalCents) {
    throw new Error("Allocations cannot exceed the expense total.");
  }
  return {
    allocatedCents,
    unallocatedCents: expenseTotalCents - allocatedCents,
  };
}

export type JobCostInputs = {
  invoicedCents: number;
  collectedCents: number;
  refundCents: number;
  discountCents: number;
  tipCents: number;
  laborCents?: number;
  laborMinutes?: number;
  fuelCents: number;
  disposalCents: number;
  maintenanceCents: number;
  equipmentCents: number;
  subcontractorCents: number;
  directPurchaseCents: number;
  otherExpenseCents: number;
  unallocatedExpenseCents: number;
  missingData: string[];
};

export function calculateOperationalJobCost(input: JobCostInputs) {
  const knownLaborCents = input.laborCents ?? 0;
  const directCostCents =
    knownLaborCents +
    input.fuelCents +
    input.disposalCents +
    input.maintenanceCents +
    input.equipmentCents +
    input.subcontractorCents +
    input.directPurchaseCents +
    input.otherExpenseCents;
  const collectedNetCents =
    input.collectedCents + input.tipCents - input.refundCents;
  const invoicedNetCents =
    input.invoicedCents - input.discountCents - input.refundCents;
  const collectedProfitCents = collectedNetCents - directCostCents;
  const invoicedProfitCents = invoicedNetCents - directCostCents;
  const hours = (input.laborMinutes ?? 0) / 60;
  const completenessScore = Math.max(
    0,
    Math.round(100 - new Set(input.missingData).size * 20),
  );

  return {
    directCostCents,
    collectedProfitCents,
    invoicedProfitCents,
    collectedMarginPercent:
      collectedNetCents > 0
        ? Math.round((collectedProfitCents / collectedNetCents) * 10_000) / 100
        : null,
    invoicedMarginPercent:
      invoicedNetCents > 0
        ? Math.round((invoicedProfitCents / invoicedNetCents) * 10_000) / 100
        : null,
    revenuePerLaborHourCents:
      hours > 0 ? Math.round(collectedNetCents / hours) : null,
    costPerLaborHourCents:
      hours > 0 ? Math.round(directCostCents / hours) : null,
    completenessScore,
    missingData: [...new Set(input.missingData)],
    unallocatedCostWarning: input.unallocatedExpenseCents > 0,
  };
}

export function advanceRecurringDate(
  date: Date,
  cadence:
    | "Weekly"
    | "Biweekly"
    | "Monthly"
    | "Quarterly"
    | "Semiannually"
    | "Annually"
    | "Custom",
  customDays?: number | null,
) {
  const next = new Date(date);
  if (cadence === "Weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (cadence === "Biweekly") next.setUTCDate(next.getUTCDate() + 14);
  if (cadence === "Monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (cadence === "Quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (cadence === "Semiannually") next.setUTCMonth(next.getUTCMonth() + 6);
  if (cadence === "Annually")
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  if (cadence === "Custom") {
    if (!customDays || customDays < 1)
      throw new Error("Custom cadence requires a positive number of days.");
    next.setUTCDate(next.getUTCDate() + customDays);
  }
  return next;
}
