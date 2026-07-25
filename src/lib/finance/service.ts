import "server-only";
import type {
  ExpenseAllocationTarget,
  ExpenseReviewStatus,
  ExpenseSourceType,
  Prisma,
  RecurringExpenseCadence,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  advanceRecurringDate,
  calculateOperationalJobCost,
  validateAllocationTotal,
  validateExpenseComponents,
} from "./calculations";
import { createCsv } from "./exports";

type Tx = Prisma.TransactionClient;

const SYSTEM_CATEGORIES = [
  "FUEL",
  "DUMP_FEES",
  "DISPOSAL",
  "VEHICLE_MAINTENANCE",
  "VEHICLE_REPAIRS",
  "EQUIPMENT",
  "TOOLS",
  "RENTAL",
  "INSURANCE",
  "ADVERTISING",
  "SOFTWARE",
  "PHONE",
  "INTERNET",
  "OFFICE",
  "UTILITIES",
  "RENT",
  "PROFESSIONAL_FEES",
  "LICENSES_PERMITS",
  "TRAINING",
  "TRAVEL",
  "MEALS",
  "PAYROLL_RELATED",
  "TAXES_FEES",
  "BANK_FEES",
  "PAYMENT_PROCESSING",
  "REFUNDS",
  "SUBCONTRACTORS",
  "CHARITABLE_DONATION",
  "MISCELLANEOUS",
  "OTHER",
] as const;

async function audit(
  tx: Tx,
  companyId: string,
  userId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  await tx.auditEvent.create({
    data: {
      companyId,
      actingUserId: userId,
      eventType,
      entityType,
      entityId,
      metadata,
    },
  });
}

async function notifyOnce(
  tx: Tx,
  input: {
    companyId: string;
    title: string;
    body: string;
    sourceType: string;
    sourceId: string;
    link?: string;
  },
) {
  const duplicate = await tx.systemNotification.findFirst({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      createdAt: { gte: new Date(Date.now() - 86_400_000) },
    },
    select: { id: true },
  });
  if (!duplicate) {
    await tx.systemNotification.create({
      data: { ...input, channel: "in-app" },
    });
  }
}

async function assertOpenPeriod(
  tx: Tx,
  companyId: string,
  date: Date,
) {
  const locked = await tx.financialPeriod.findFirst({
    where: {
      companyId,
      status: "Locked",
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: { name: true },
  });
  if (locked) throw new Error(`${locked.name} is locked.`);
}

export async function ensureSystemExpenseCategories(companyId: string) {
  await prisma.$transaction(
    SYSTEM_CATEGORIES.map((code) =>
      prisma.expenseCategory.upsert({
        where: { companyId_code: { companyId, code } },
        update: { isSystem: true },
        create: {
          companyId,
          code,
          name: code
            .toLowerCase()
            .split("_")
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join(" "),
          isSystem: true,
        },
      }),
    ),
  );
}

export async function listExpenseCategories(companyId: string) {
  await ensureSystemExpenseCategories(companyId);
  return prisma.expenseCategory.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function createExpenseCategory(
  companyId: string,
  userId: string,
  input: { name: string; parentId?: string },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  if (
    input.parentId &&
    !(await prisma.expenseCategory.findFirst({
      where: { id: input.parentId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Parent category not found.");
  return prisma.$transaction(async (tx) => {
    const category = await tx.expenseCategory.create({
      data: {
        companyId,
        name,
        code: `CUSTOM_${name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        parentId: input.parentId,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.category.created",
      "ExpenseCategory",
      category.id,
    );
    return category;
  });
}

export async function updateExpenseCategory(
  companyId: string,
  userId: string,
  categoryId: string,
  input: { name?: string; active?: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.expenseCategory.findFirst({
      where: { id: categoryId, companyId },
    });
    if (!current) throw new Error("Category not found.");
    if (current.isSystem && input.name && input.name !== current.name)
      throw new Error("System category names cannot be changed.");
    const category = await tx.expenseCategory.update({
      where: { id: current.id },
      data: {
        name: input.name?.trim() || undefined,
        active: input.active,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.category.updated",
      "ExpenseCategory",
      category.id,
    );
    return category;
  });
}

function normalizeVendorName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function detectPotentialDuplicateVendor(
  companyId: string,
  name: string,
) {
  const normalizedName = normalizeVendorName(name);
  return prisma.vendor.findMany({
    where: {
      companyId,
      OR: [
        { normalizedName },
        { normalizedName: { contains: normalizedName } },
      ],
    },
    select: { id: true, name: true, type: true, active: true },
    take: 10,
  });
}

export type VendorInput = {
  name: string;
  type?: string;
  legalName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  taxIdReference?: string;
  accountNumberReference?: string;
  paymentTerms?: string;
  notes?: string;
  active?: boolean;
};

export async function createVendor(
  companyId: string,
  userId: string,
  input: VendorInput,
) {
  if (!input.name.trim()) throw new Error("Vendor name is required.");
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        ...input,
        companyId,
        name: input.name.trim(),
        normalizedName: normalizeVendorName(input.name),
        active: input.active ?? true,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.vendor.created",
      "Vendor",
      vendor.id,
    );
    return vendor;
  });
}

export async function updateVendor(
  companyId: string,
  userId: string,
  vendorId: string,
  input: Partial<VendorInput>,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.vendor.findFirst({
      where: { id: vendorId, companyId },
      select: { id: true },
    });
    if (!current) throw new Error("Vendor not found.");
    const vendor = await tx.vendor.update({
      where: { id: current.id },
      data: {
        ...input,
        name: input.name?.trim(),
        normalizedName: input.name
          ? normalizeVendorName(input.name)
          : undefined,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.vendor.updated",
      "Vendor",
      vendor.id,
    );
    return vendor;
  });
}

export async function listVendors(
  companyId: string,
  search?: string,
) {
  return prisma.vendor.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { expenses: true, documents: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export type CreateExpenseInput = {
  transactionDate: Date;
  postingDate?: Date;
  vendorId?: string;
  categoryId: string;
  description: string;
  subtotalCents: number;
  taxCents?: number;
  tipCents?: number;
  feeCents?: number;
  totalCents: number;
  currencyCode?: string;
  paymentMethod?: string;
  transactionReference?: string;
  deductibleClassification?: string;
  businessUsePercentage?: number;
  reimbursementStatus?: string;
  recurringExpenseId?: string;
  sourceType?: ExpenseSourceType;
  sourceRecordId?: string;
  fuelEntryId?: string;
  maintenanceRecordId?: string;
  notes?: string;
};

async function validateExpenseReferences(
  tx: Tx,
  companyId: string,
  input: CreateExpenseInput,
) {
  const [category, vendor, recurring, fuel, maintenance] = await Promise.all([
    tx.expenseCategory.findFirst({
      where: { id: input.categoryId, companyId, active: true },
      select: { id: true },
    }),
    input.vendorId
      ? tx.vendor.findFirst({
          where: { id: input.vendorId, companyId },
          select: { id: true },
        })
      : null,
    input.recurringExpenseId
      ? tx.recurringExpense.findFirst({
          where: { id: input.recurringExpenseId, companyId },
          select: { id: true },
        })
      : null,
    input.fuelEntryId
      ? tx.fuelEntry.findFirst({
          where: { id: input.fuelEntryId, companyId },
          select: { id: true },
        })
      : null,
    input.maintenanceRecordId
      ? tx.assetMaintenanceRecord.findFirst({
          where: { id: input.maintenanceRecordId, companyId },
          select: { id: true },
        })
      : null,
  ]);
  if (!category) throw new Error("Active expense category not found.");
  if (input.vendorId && !vendor) throw new Error("Vendor not found.");
  if (input.recurringExpenseId && !recurring)
    throw new Error("Recurring obligation not found.");
  if (input.fuelEntryId && !fuel) throw new Error("Fuel source not found.");
  if (input.maintenanceRecordId && !maintenance)
    throw new Error("Maintenance source not found.");
}

export async function createDraftExpense(
  companyId: string,
  userId: string,
  input: CreateExpenseInput,
) {
  validateExpenseComponents(input);
  if (!input.description.trim()) throw new Error("Description is required.");
  if (
    input.businessUsePercentage !== undefined &&
    (input.businessUsePercentage < 0 || input.businessUsePercentage > 100)
  )
    throw new Error("Business-use percentage must be between 0 and 100.");
  return prisma.$transaction(async (tx) => {
    await assertOpenPeriod(tx, companyId, input.transactionDate);
    await validateExpenseReferences(tx, companyId, input);
    const latest = await tx.businessExpense.aggregate({
      where: { companyId },
      _max: { expenseNumber: true },
    });
    const expense = await tx.businessExpense.create({
      data: {
        ...input,
        companyId,
        createdById: userId,
        expenseNumber: (latest._max.expenseNumber ?? 0) + 1,
        description: input.description.trim(),
        taxCents: input.taxCents ?? 0,
        tipCents: input.tipCents ?? 0,
        feeCents: input.feeCents ?? 0,
        currencyCode: input.currencyCode ?? "USD",
        sourceType: input.sourceType ?? "Manual",
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.expense.created",
      "BusinessExpense",
      expense.id,
      { expenseNumber: expense.expenseNumber, sourceType: expense.sourceType },
    );
    return expense;
  });
}

async function transitionExpense(
  companyId: string,
  userId: string,
  expenseId: string,
  allowed: ExpenseReviewStatus[],
  status: ExpenseReviewStatus,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.businessExpense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new Error("Expense not found.");
    if (!allowed.includes(expense.reviewStatus))
      throw new Error(`Expense cannot move from ${expense.reviewStatus} to ${status}.`);
    await assertOpenPeriod(tx, companyId, expense.transactionDate);
    const updated = await tx.businessExpense.update({
      where: { id: expense.id },
      data: {
        reviewStatus: status,
        reviewedById: ["Approved", "Rejected"].includes(status)
          ? userId
          : undefined,
        reviewedAt: ["Approved", "Rejected"].includes(status)
          ? new Date()
          : undefined,
        rejectionReason: status === "Rejected" ? reason : undefined,
        voidReason: status === "Voided" ? reason : undefined,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      `finance.expense.${status.toLowerCase()}`,
      "BusinessExpense",
      expense.id,
      reason ? { reason } : undefined,
    );
    if (status === "NeedsReview") {
      await notifyOnce(tx, {
        companyId,
        title: "Expense awaiting approval",
        body: `Expense #${expense.expenseNumber} is ready for review.`,
        sourceType: "finance-expense-review",
        sourceId: expense.id,
        link: `/finance/expenses/${expense.id}`,
      });
    }
    if (status === "Rejected") {
      await notifyOnce(tx, {
        companyId,
        title: "Expense rejected",
        body: `Expense #${expense.expenseNumber} requires correction.`,
        sourceType: "finance-expense-rejected",
        sourceId: expense.id,
        link: `/finance/expenses/${expense.id}`,
      });
    }
    return updated;
  });
}

export const submitExpense = (
  companyId: string,
  userId: string,
  expenseId: string,
) =>
  transitionExpense(companyId, userId, expenseId, ["Draft", "Rejected"], "NeedsReview");

export const approveExpense = (
  companyId: string,
  userId: string,
  expenseId: string,
) =>
  transitionExpense(companyId, userId, expenseId, ["NeedsReview"], "Approved");

export const rejectExpense = (
  companyId: string,
  userId: string,
  expenseId: string,
  reason: string,
) => {
  if (!reason.trim()) throw new Error("A rejection reason is required.");
  return transitionExpense(
    companyId,
    userId,
    expenseId,
    ["NeedsReview"],
    "Rejected",
    reason.trim(),
  );
};

export const voidExpense = (
  companyId: string,
  userId: string,
  expenseId: string,
  reason: string,
) => {
  if (!reason.trim()) throw new Error("A void reason is required.");
  return transitionExpense(
    companyId,
    userId,
    expenseId,
    ["Draft", "NeedsReview", "Approved", "Rejected"],
    "Voided",
    reason.trim(),
  );
};

export async function reviseApprovedExpense(
  companyId: string,
  userId: string,
  expenseId: string,
  reason: string,
  changes: Partial<
    Pick<
      CreateExpenseInput,
      | "transactionDate"
      | "postingDate"
      | "vendorId"
      | "categoryId"
      | "description"
      | "subtotalCents"
      | "taxCents"
      | "tipCents"
      | "feeCents"
      | "totalCents"
      | "paymentMethod"
      | "transactionReference"
      | "notes"
    >
  >,
) {
  if (!reason.trim()) throw new Error("A correction reason is required.");
  return prisma.$transaction(async (tx) => {
    const current = await tx.businessExpense.findFirst({
      where: { id: expenseId, companyId, reviewStatus: "Approved" },
      include: { _count: { select: { revisions: true } } },
    });
    if (!current) throw new Error("Approved expense not found.");
    const next = { ...current, ...changes };
    validateExpenseComponents(next);
    await assertOpenPeriod(tx, companyId, next.transactionDate);
    await validateExpenseReferences(tx, companyId, {
      transactionDate: next.transactionDate,
      postingDate: next.postingDate ?? undefined,
      vendorId: next.vendorId ?? undefined,
      categoryId: next.categoryId,
      description: next.description,
      subtotalCents: next.subtotalCents,
      taxCents: next.taxCents,
      tipCents: next.tipCents,
      feeCents: next.feeCents,
      totalCents: next.totalCents,
      recurringExpenseId: next.recurringExpenseId ?? undefined,
      sourceType: next.sourceType,
      sourceRecordId: next.sourceRecordId ?? undefined,
      fuelEntryId: next.fuelEntryId ?? undefined,
      maintenanceRecordId: next.maintenanceRecordId ?? undefined,
    });
    const previousValues = {
      transactionDate: current.transactionDate.toISOString(),
      vendorId: current.vendorId,
      categoryId: current.categoryId,
      description: current.description,
      subtotalCents: current.subtotalCents,
      taxCents: current.taxCents,
      tipCents: current.tipCents,
      feeCents: current.feeCents,
      totalCents: current.totalCents,
    };
    const revisedValues = {
      transactionDate: next.transactionDate.toISOString(),
      vendorId: next.vendorId,
      categoryId: next.categoryId,
      description: next.description,
      subtotalCents: next.subtotalCents,
      taxCents: next.taxCents,
      tipCents: next.tipCents,
      feeCents: next.feeCents,
      totalCents: next.totalCents,
    };
    const revised = await tx.businessExpense.update({
      where: { id: current.id },
      data: changes,
    });
    await tx.expenseRevision.create({
      data: {
        companyId,
        expenseId: current.id,
        revisionNumber: current._count.revisions + 1,
        reason: reason.trim(),
        previousValues,
        revisedValues,
        correctedById: userId,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.expense.revised",
      "BusinessExpense",
      current.id,
      { reason: reason.trim(), revision: current._count.revisions + 1 },
    );
    return revised;
  });
}

export type AllocationInput = {
  targetType: ExpenseAllocationTarget;
  jobId?: string;
  customerId?: string;
  employeeId?: string;
  crewId?: string;
  assetId?: string;
  locationReference?: string;
  departmentReference?: string;
  accountingClass?: string;
  allocatedAmountCents: number;
  allocatedPercentage?: number;
  notes?: string;
};

export async function allocateExpense(
  companyId: string,
  userId: string,
  expenseId: string,
  input: AllocationInput,
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.businessExpense.findFirst({
      where: { id: expenseId, companyId },
      include: { allocations: { select: { allocatedAmountCents: true } } },
    });
    if (!expense) throw new Error("Expense not found.");
    await assertOpenPeriod(tx, companyId, expense.transactionDate);
    const targetId = {
      Job: input.jobId,
      Customer: input.customerId,
      Employee: input.employeeId,
      Crew: input.crewId,
      Asset: input.assetId,
      Location: input.locationReference,
      Department: input.departmentReference,
      AccountingClass: input.accountingClass,
    }[input.targetType];
    if (!targetId) throw new Error("The selected allocation target is required.");
    const targetExists =
      input.targetType === "Job"
        ? await tx.job.findFirst({ where: { id: input.jobId, companyId } })
        : input.targetType === "Customer"
          ? await tx.customer.findFirst({
              where: { id: input.customerId, companyId },
            })
          : input.targetType === "Employee"
            ? await tx.employee.findFirst({
                where: { id: input.employeeId, companyId },
              })
            : input.targetType === "Crew"
              ? await tx.crew.findFirst({
                  where: { id: input.crewId, companyId },
                })
              : input.targetType === "Asset"
                ? await tx.fleetAsset.findFirst({
                    where: { id: input.assetId, companyId },
                  })
                : { id: targetId };
    if (!targetExists) throw new Error("Allocation target not found.");
    validateAllocationTotal(expense.totalCents, [
      ...expense.allocations.map((item) => item.allocatedAmountCents),
      input.allocatedAmountCents,
    ]);
    const allocation = await tx.expenseAllocation.create({
      data: { companyId, expenseId, ...input },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.expense.allocation.created",
      "ExpenseAllocation",
      allocation.id,
      { expenseId, targetType: input.targetType },
    );
    return allocation;
  });
}

export async function listExpenses(
  companyId: string,
  filters: {
    search?: string;
    from?: Date;
    to?: Date;
    categoryId?: string;
    vendorId?: string;
    reviewStatus?: ExpenseReviewStatus;
    paymentMethod?: string;
    sourceType?: ExpenseSourceType;
    receipt?: "attached" | "missing";
    allocation?: "allocated" | "unallocated";
  } = {},
) {
  return prisma.businessExpense.findMany({
    where: {
      companyId,
      transactionDate: { gte: filters.from, lte: filters.to },
      categoryId: filters.categoryId,
      vendorId: filters.vendorId,
      reviewStatus: filters.reviewStatus,
      paymentMethod: filters.paymentMethod,
      sourceType: filters.sourceType,
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search, mode: "insensitive" } },
              {
                transactionReference: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(filters.receipt === "attached"
        ? { documents: { some: { category: "Receipt" } } }
        : filters.receipt === "missing"
          ? { documents: { none: { category: "Receipt" } } }
          : {}),
      ...(filters.allocation === "allocated"
        ? { allocations: { some: {} } }
        : filters.allocation === "unallocated"
          ? { allocations: { none: {} } }
          : {}),
    },
    include: {
      category: true,
      vendor: true,
      documents: { select: { id: true, category: true } },
      allocations: { select: { allocatedAmountCents: true } },
    },
    orderBy: [{ transactionDate: "desc" }, { expenseNumber: "desc" }],
  });
}

export async function getExpenseDetail(companyId: string, expenseId: string) {
  return prisma.businessExpense.findFirst({
    where: { id: expenseId, companyId },
    include: {
      category: true,
      vendor: true,
      documents: true,
      allocations: {
        include: {
          job: { select: { id: true, jobNumber: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
          crew: { select: { id: true, name: true } },
          asset: { select: { id: true, assetNumber: true, name: true } },
        },
      },
      revisions: { orderBy: { revisionNumber: "desc" } },
    },
  });
}

export async function createRecurringExpense(
  companyId: string,
  userId: string,
  input: {
    vendorId?: string;
    categoryId: string;
    description: string;
    cadence: RecurringExpenseCadence;
    customCadenceDays?: number;
    expectedAmountCents: number;
    nextDueDate: Date;
    startDate: Date;
    endDate?: Date;
    autoCreateDraft?: boolean;
    reminderLeadDays?: number;
    paymentMethod?: string;
    linkedAssetId?: string;
    notes?: string;
  },
) {
  if (input.expectedAmountCents < 0)
    throw new Error("Expected amount cannot be negative.");
  return prisma.$transaction(async (tx) => {
    await validateExpenseReferences(tx, companyId, {
      ...input,
      transactionDate: input.nextDueDate,
      description: input.description,
      subtotalCents: input.expectedAmountCents,
      totalCents: input.expectedAmountCents,
    });
    if (
      input.linkedAssetId &&
      !(await tx.fleetAsset.findFirst({
        where: { id: input.linkedAssetId, companyId },
      }))
    )
      throw new Error("Linked asset not found.");
    const recurring = await tx.recurringExpense.create({
      data: { ...input, companyId },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.recurring.created",
      "RecurringExpense",
      recurring.id,
    );
    return recurring;
  });
}

export async function generateRecurringDrafts(
  companyId: string,
  userId: string,
  through = new Date(),
) {
  const obligations = await prisma.recurringExpense.findMany({
    where: {
      companyId,
      active: true,
      autoCreateDraft: true,
      nextDueDate: { lte: through },
      OR: [{ endDate: null }, { endDate: { gte: through } }],
    },
  });
  const generated: string[] = [];
  for (const obligation of obligations) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.recurringExpense.findFirst({
        where: {
          id: obligation.id,
          companyId,
          nextDueDate: obligation.nextDueDate,
        },
      });
      if (!current) return;
      const sourceRecordId = `${current.id}:${current.nextDueDate.toISOString()}`;
      const duplicate = await tx.businessExpense.findFirst({
        where: { companyId, sourceType: "Subscription", sourceRecordId },
      });
      if (duplicate) return;
      await assertOpenPeriod(tx, companyId, current.nextDueDate);
      const latest = await tx.businessExpense.aggregate({
        where: { companyId },
        _max: { expenseNumber: true },
      });
      const expense = await tx.businessExpense.create({
        data: {
          companyId,
          expenseNumber: (latest._max.expenseNumber ?? 0) + 1,
          transactionDate: current.nextDueDate,
          vendorId: current.vendorId,
          categoryId: current.categoryId,
          description: current.description,
          subtotalCents: current.expectedAmountCents,
          totalCents: current.expectedAmountCents,
          paymentMethod: current.paymentMethod,
          recurringExpenseId: current.id,
          sourceType: "Subscription",
          sourceRecordId,
          createdById: userId,
        },
      });
      await tx.recurringExpense.update({
        where: { id: current.id },
        data: {
          nextDueDate: advanceRecurringDate(
            current.nextDueDate,
            current.cadence,
            current.customCadenceDays,
          ),
        },
      });
      await audit(
        tx,
        companyId,
        userId,
        "finance.recurring.draft.generated",
        "BusinessExpense",
        expense.id,
        { recurringExpenseId: current.id },
      );
      generated.push(expense.id);
    });
  }
  return generated;
}

export async function listUpcomingObligations(
  companyId: string,
  through = new Date(Date.now() + 30 * 86_400_000),
) {
  return prisma.recurringExpense.findMany({
    where: { companyId, active: true, nextDueDate: { lte: through } },
    include: { vendor: true, category: true, linkedAsset: true },
    orderBy: { nextDueDate: "asc" },
  });
}

export async function createManualIncomeAdjustment(
  companyId: string,
  userId: string,
  input: {
    effectiveDate: Date;
    amountCents: number;
    type: string;
    description: string;
  },
) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents === 0)
    throw new Error("Income adjustment must be a non-zero whole-cent amount.");
  return prisma.$transaction(async (tx) => {
    await assertOpenPeriod(tx, companyId, input.effectiveDate);
    const adjustment = await tx.manualIncomeAdjustment.create({
      data: { ...input, companyId, createdById: userId },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.income-adjustment.created",
      "ManualIncomeAdjustment",
      adjustment.id,
      { type: input.type, amountCents: input.amountCents },
    );
    return adjustment;
  });
}

export async function getIncomeSummary(
  companyId: string,
  from: Date,
  to: Date,
) {
  const [invoices, payments, refunds, adjustments] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, createdAt: { gte: from, lte: to }, status: { not: "Void" } },
      select: { total: true, balanceDue: true, discounts: true },
    }),
    prisma.payment.findMany({
      where: {
        companyId,
        paymentDate: { gte: from, lte: to },
        providerStatus: "Captured",
      },
      select: { amount: true, processingFee: true },
    }),
    prisma.refund.findMany({
      where: { companyId, refundedAt: { gte: from, lte: to } },
      select: { amount: true },
    }),
    prisma.manualIncomeAdjustment.aggregate({
      where: { companyId, effectiveDate: { gte: from, lte: to } },
      _sum: { amountCents: true },
    }),
  ]);
  const dollarsToCents = (value: number) => Math.round(value * 100);
  return {
    invoicedRevenueCents: invoices.reduce(
      (sum, item) => sum + dollarsToCents(item.total),
      0,
    ),
    collectedRevenueCents: payments.reduce(
      (sum, item) => sum + dollarsToCents(item.amount),
      0,
    ),
    outstandingRevenueCents: invoices.reduce(
      (sum, item) => sum + dollarsToCents(item.balanceDue),
      0,
    ),
    refundsCents: refunds.reduce(
      (sum, item) => sum + dollarsToCents(item.amount),
      0,
    ),
    discountsCents: invoices.reduce(
      (sum, item) => sum + dollarsToCents(item.discounts),
      0,
    ),
    processingFeesCents: payments.reduce(
      (sum, item) => sum + dollarsToCents(item.processingFee),
      0,
    ),
    manualAdjustmentsCents: adjustments._sum.amountCents ?? 0,
  };
}

export async function getJobCostSummary(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    include: {
      invoice: {
        include: {
          payments: {
            where: { providerStatus: "Captured" },
            select: { amount: true },
          },
          refunds: { select: { amount: true } },
        },
      },
      fuelEntries: {
        where: { expenses: { none: { reviewStatus: "Approved" } } },
        select: { totalCostCents: true },
      },
      disposalRecords: { select: { cost: true } },
      timeAllocations: {
        where: { workSession: { approvalStatus: "Approved" } },
        include: {
          workSession: {
            select: {
              clockInAt: true,
              regularMinutes: true,
              overtimeMinutes: true,
            },
          },
          employee: {
            select: {
              compensationHistory: {
                orderBy: { effectiveStartDate: "desc" },
                select: {
                  compensationType: true,
                  hourlyRateCents: true,
                  effectiveStartDate: true,
                  effectiveEndDate: true,
                  overtimeEligible: true,
                },
              },
            },
          },
        },
      },
      expenseAllocations: {
        where: { expense: { reviewStatus: "Approved" } },
        include: { expense: { include: { category: true } } },
      },
    },
  });
  if (!job) throw new Error("Job not found.");
  let laborCents = 0;
  let laborMinutes = 0;
  const missingData: string[] = [];
  for (const allocation of job.timeAllocations) {
    laborMinutes += allocation.allocatedMinutes;
    const rate = allocation.employee.compensationHistory.find(
      (item) =>
        item.effectiveStartDate <= allocation.workSession.clockInAt &&
        (!item.effectiveEndDate ||
          item.effectiveEndDate >= allocation.workSession.clockInAt),
    );
    if (!rate?.hourlyRateCents || rate.compensationType !== "Hourly") {
      missingData.push("Eligible hourly labor rate");
      continue;
    }
    const sessionMinutes =
      allocation.workSession.regularMinutes +
      allocation.workSession.overtimeMinutes;
    const overtimeShare =
      sessionMinutes > 0
        ? allocation.allocatedMinutes *
          (allocation.workSession.overtimeMinutes / sessionMinutes)
        : 0;
    const regularShare = allocation.allocatedMinutes - overtimeShare;
    laborCents += Math.round(
      (regularShare / 60) * rate.hourlyRateCents +
        (overtimeShare / 60) *
          rate.hourlyRateCents *
          (rate.overtimeEligible ? 1.5 : 1),
    );
  }
  if (!job.invoice) missingData.push("Invoice");
  if (!job.timeAllocations.length) missingData.push("Approved labor allocation");
  const byCategory = (codes: string[]) =>
    job.expenseAllocations
      .filter((item) => codes.includes(item.expense.category.code))
      .reduce((sum, item) => sum + item.allocatedAmountCents, 0);
  const invoice = job.invoice;
  const input = {
    invoicedCents: invoice ? Math.round(invoice.total * 100) : 0,
    collectedCents:
      invoice?.payments.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0,
      ) ?? 0,
    refundCents:
      invoice?.refunds.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0,
      ) ?? 0,
    discountCents: invoice ? Math.round(invoice.discounts * 100) : 0,
    tipCents: 0,
    laborCents,
    laborMinutes,
    fuelCents:
      job.fuelEntries.reduce((sum, item) => sum + item.totalCostCents, 0) +
      byCategory(["FUEL"]),
    disposalCents:
      job.disposalRecords.reduce(
        (sum, item) => sum + Math.round(item.cost * 100),
        0,
      ) + byCategory(["DUMP_FEES", "DISPOSAL"]),
    maintenanceCents: byCategory(["VEHICLE_MAINTENANCE", "VEHICLE_REPAIRS"]),
    equipmentCents: byCategory(["EQUIPMENT", "TOOLS", "RENTAL"]),
    subcontractorCents: byCategory(["SUBCONTRACTORS"]),
    directPurchaseCents: byCategory(["OFFICE", "MISCELLANEOUS"]),
    otherExpenseCents: byCategory(["OTHER"]),
    unallocatedExpenseCents: 0,
    missingData,
  };
  return {
    job: {
      id: job.id,
      jobNumber: job.jobNumber,
      status: job.status,
    },
    inputs: input,
    ...calculateOperationalJobCost(input),
  };
}

export async function getFinanceDashboardSummary(
  companyId: string,
  from: Date,
  to: Date,
) {
  const trendFrom = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 5, 1),
  );
  const [
    income,
    expenses,
    awaitingReview,
    upcoming,
    recent,
    jobs,
    trendPayments,
    trendExpenses,
    categoryExpenses,
    jobCosts,
  ] =
    await Promise.all([
      getIncomeSummary(companyId, from, to),
      prisma.businessExpense.findMany({
        where: {
          companyId,
          transactionDate: { gte: from, lte: to },
          reviewStatus: "Approved",
        },
        select: {
          totalCents: true,
          allocations: { select: { allocatedAmountCents: true } },
        },
      }),
      prisma.businessExpense.count({
        where: { companyId, reviewStatus: "NeedsReview" },
      }),
      listUpcomingObligations(companyId),
      listExpenses(companyId).then((rows) => rows.slice(0, 8)),
      prisma.job.findMany({
        where: { companyId, status: "Completed" },
        select: { id: true },
        take: 100,
      }),
      prisma.payment.findMany({
        where: {
          companyId,
          providerStatus: "Captured",
          paymentDate: { gte: trendFrom, lte: to },
        },
        select: { paymentDate: true, amount: true },
      }),
      prisma.businessExpense.findMany({
        where: {
          companyId,
          reviewStatus: "Approved",
          transactionDate: { gte: trendFrom, lte: to },
        },
        select: { transactionDate: true, totalCents: true },
      }),
      prisma.businessExpense.findMany({
        where: {
          companyId,
          reviewStatus: "Approved",
          transactionDate: { gte: from, lte: to },
        },
        select: { totalCents: true, category: { select: { name: true } } },
      }),
      listJobCostingRows(companyId),
    ]);
  const approvedExpenseCents = expenses.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );
  const unallocatedExpenseCents = expenses.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        item.totalCents -
          item.allocations.reduce(
            (allocated, allocation) =>
              allocated + allocation.allocatedAmountCents,
            0,
          ),
      ),
    0,
  );
  const monthKey = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(
        trendFrom.getUTCFullYear(),
        trendFrom.getUTCMonth() + index,
        1,
      ),
    );
    const key = monthKey(date);
    const collectedCents = trendPayments
      .filter((item) => monthKey(item.paymentDate) === key)
      .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    const expenseCents = trendExpenses
      .filter((item) => monthKey(item.transactionDate) === key)
      .reduce((sum, item) => sum + item.totalCents, 0);
    return {
      key,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      collectedCents,
      expenseCents,
      operationalProfitCents: collectedCents - expenseCents,
    };
  });
  const categoryMap = new Map<string, number>();
  for (const item of categoryExpenses)
    categoryMap.set(
      item.category.name,
      (categoryMap.get(item.category.name) ?? 0) + item.totalCents,
    );
  const expenseByCategory = [...categoryMap]
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
  const driverMap = new Map<string, number>([
    ["Labor", 0],
    ["Fuel", 0],
    ["Disposal", 0],
    ["Maintenance", 0],
    ["Equipment", 0],
    ["Other direct costs", 0],
  ]);
  for (const item of jobCosts) {
    driverMap.set(
      "Labor",
      (driverMap.get("Labor") ?? 0) + (item.inputs.laborCents ?? 0),
    );
    driverMap.set(
      "Fuel",
      (driverMap.get("Fuel") ?? 0) + item.inputs.fuelCents,
    );
    driverMap.set(
      "Disposal",
      (driverMap.get("Disposal") ?? 0) + item.inputs.disposalCents,
    );
    driverMap.set(
      "Maintenance",
      (driverMap.get("Maintenance") ?? 0) + item.inputs.maintenanceCents,
    );
    driverMap.set(
      "Equipment",
      (driverMap.get("Equipment") ?? 0) + item.inputs.equipmentCents,
    );
    driverMap.set(
      "Other direct costs",
      (driverMap.get("Other direct costs") ?? 0) +
        item.inputs.subcontractorCents +
        item.inputs.directPurchaseCents +
        item.inputs.otherExpenseCents,
    );
  }
  const topCostDrivers = [...driverMap]
    .map(([label, totalCents]) => ({ label, totalCents }))
    .filter((item) => item.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 4);
  return {
    income,
    approvedExpenseCents,
    operationalProfitCents:
      income.collectedRevenueCents -
      income.refundsCents -
      approvedExpenseCents,
    awaitingReview,
    upcoming,
    recent,
    unallocatedExpenseCents,
    completedJobCount: jobs.length,
    monthlyTrend,
    expenseByCategory,
    topCostDrivers,
  };
}

export async function createFinancialPeriod(
  companyId: string,
  userId: string,
  input: { name: string; startDate: Date; endDate: Date },
) {
  if (input.endDate < input.startDate)
    throw new Error("Period end must be after its start.");
  return prisma.$transaction(async (tx) => {
    const period = await tx.financialPeriod.create({
      data: { ...input, companyId },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.period.created",
      "FinancialPeriod",
      period.id,
    );
    return period;
  });
}

export async function lockFinancialPeriod(
  companyId: string,
  userId: string,
  periodId: string,
) {
  return prisma.$transaction(async (tx) => {
    const period = await tx.financialPeriod.findFirst({
      where: { id: periodId, companyId },
    });
    if (!period) throw new Error("Financial period not found.");
    const updated = await tx.financialPeriod.update({
      where: { id: period.id },
      data: { status: "Locked", lockedAt: new Date(), lockedById: userId },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.period.locked",
      "FinancialPeriod",
      period.id,
    );
    await notifyOnce(tx, {
      companyId,
      title: "Reporting period locked",
      body: `${period.name} is locked for ordinary finance edits.`,
      sourceType: "finance-period-locked",
      sourceId: period.id,
      link: "/finance/periods",
    });
    return updated;
  });
}

export async function unlockFinancialPeriod(
  companyId: string,
  userId: string,
  periodId: string,
  reason: string,
) {
  if (!reason.trim()) throw new Error("An unlock reason is required.");
  return prisma.$transaction(async (tx) => {
    const period = await tx.financialPeriod.findFirst({
      where: { id: periodId, companyId, status: "Locked" },
    });
    if (!period) throw new Error("Locked financial period not found.");
    const updated = await tx.financialPeriod.update({
      where: { id: period.id },
      data: {
        status: "Open",
        unlockedAt: new Date(),
        unlockedById: userId,
        unlockReason: reason.trim(),
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.period.unlocked",
      "FinancialPeriod",
      period.id,
      { reason: reason.trim() },
    );
    return updated;
  });
}

export async function listFinancialPeriods(companyId: string) {
  return prisma.financialPeriod.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });
}

export async function exportExpensesCsv(
  companyId: string,
  userId: string,
  from?: Date,
  to?: Date,
) {
  const expenses = await listExpenses(companyId, { from, to });
  const csv = createCsv(
    [
      "expenseNumber",
      "transactionDate",
      "vendor",
      "category",
      "description",
      "subtotalCents",
      "taxCents",
      "tipCents",
      "feeCents",
      "totalCents",
      "currencyCode",
      "reviewStatus",
      "sourceType",
      "sourceRecordId",
    ],
    expenses.map((item) => ({
      ...item,
      vendor: item.vendor?.name,
      category: item.category.name,
    })),
  );
  await prisma.auditEvent.create({
    data: {
      companyId,
      actingUserId: userId,
      eventType: "finance.export.expenses",
      entityType: "BusinessExpense",
      metadata: { rowCount: expenses.length },
    },
  });
  return csv;
}

export type FinanceExportKind =
  | "expenses"
  | "allocations"
  | "vendors"
  | "categories"
  | "documents"
  | "recurring"
  | "income"
  | "job-costs"
  | "periods"
  | "revisions"
  | "operational-sources"
  | "asset-purchases";

export async function exportFinanceCsv(
  companyId: string,
  userId: string,
  kind: FinanceExportKind,
) {
  let columns: string[] = [];
  let rows: Array<Record<string, unknown>> = [];
  if (kind === "expenses") return exportExpensesCsv(companyId, userId);
  if (kind === "allocations") {
    columns = [
      "expenseNumber",
      "targetType",
      "targetReference",
      "allocatedAmountCents",
      "allocatedPercentage",
      "notes",
    ];
    const values = await prisma.expenseAllocation.findMany({
      where: { companyId },
      include: {
        expense: { select: { expenseNumber: true } },
        job: { select: { jobNumber: true } },
        customer: { select: { firstName: true, lastName: true } },
        employee: { select: { firstName: true, lastName: true } },
        crew: { select: { name: true } },
        asset: { select: { assetNumber: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    rows = values.map((item) => ({
      ...item,
      expenseNumber: item.expense.expenseNumber,
      targetReference:
        item.job?.jobNumber ??
        (item.customer
          ? `${item.customer.firstName} ${item.customer.lastName}`
          : item.employee
            ? `${item.employee.firstName} ${item.employee.lastName}`
            : item.crew?.name ??
              (item.asset
                ? `${item.asset.assetNumber} ${item.asset.name}`
                : item.locationReference ??
                  item.departmentReference ??
                  item.accountingClass)),
    }));
  }
  if (kind === "vendors") {
    columns = [
      "name",
      "type",
      "legalName",
      "contactName",
      "email",
      "phone",
      "website",
      "address",
      "city",
      "state",
      "postalCode",
      "paymentTerms",
      "active",
    ];
    rows = await prisma.vendor.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }
  if (kind === "categories") {
    columns = ["code", "name", "isSystem", "active", "parent"];
    const values = await prisma.expenseCategory.findMany({
      where: { companyId },
      include: { parent: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    rows = values.map((item) => ({ ...item, parent: item.parent?.name }));
  }
  if (kind === "documents") {
    columns = [
      "category",
      "originalFilename",
      "mimeType",
      "sizeBytes",
      "transactionDate",
      "expenseNumber",
      "vendor",
      "jobNumber",
      "assetNumber",
      "createdAt",
    ];
    const values = await listFinanceDocuments(companyId);
    rows = values.map((item) => ({
      ...item,
      expenseNumber: item.expense?.expenseNumber,
      vendor: item.vendor?.name,
      jobNumber: item.job?.jobNumber,
      assetNumber: item.asset?.assetNumber,
    }));
  }
  if (kind === "recurring") {
    columns = [
      "description",
      "vendor",
      "category",
      "cadence",
      "expectedAmountCents",
      "nextDueDate",
      "startDate",
      "endDate",
      "autoCreateDraft",
      "reminderLeadDays",
      "active",
      "paymentMethod",
      "assetNumber",
    ];
    const values = await prisma.recurringExpense.findMany({
      where: { companyId },
      include: { vendor: true, category: true, linkedAsset: true },
      orderBy: { nextDueDate: "asc" },
    });
    rows = values.map((item) => ({
      ...item,
      vendor: item.vendor?.name,
      category: item.category.name,
      assetNumber: item.linkedAsset?.assetNumber,
    }));
  }
  if (kind === "income") {
    columns = ["metric", "amountCents"];
    const summary = await getIncomeSummary(
      companyId,
      new Date("1970-01-01T00:00:00.000Z"),
      new Date("9999-12-31T23:59:59.999Z"),
    );
    rows = Object.entries(summary).map(([metric, amountCents]) => ({
      metric,
      amountCents,
    }));
  }
  if (kind === "job-costs") {
    columns = [
      "jobNumber",
      "status",
      "invoicedCents",
      "collectedCents",
      "laborCents",
      "fuelCents",
      "disposalCents",
      "directCostCents",
      "collectedProfitCents",
      "collectedMarginPercent",
      "completenessScore",
      "missingData",
    ];
    const values = await listJobCostingRows(companyId);
    rows = values.map((item) => ({
      jobNumber: item.job.jobNumber,
      status: item.job.status,
      invoicedCents: item.inputs.invoicedCents,
      collectedCents: item.inputs.collectedCents,
      laborCents: item.inputs.laborCents,
      fuelCents: item.inputs.fuelCents,
      disposalCents: item.inputs.disposalCents,
      directCostCents: item.directCostCents,
      collectedProfitCents: item.collectedProfitCents,
      collectedMarginPercent: item.collectedMarginPercent,
      completenessScore: item.completenessScore,
      missingData: item.missingData.join("; "),
    }));
  }
  if (kind === "periods") {
    columns = [
      "name",
      "startDate",
      "endDate",
      "status",
      "lockedAt",
      "unlockedAt",
      "unlockReason",
    ];
    rows = await listFinancialPeriods(companyId);
  }
  if (kind === "revisions") {
    columns = [
      "expenseNumber",
      "revisionNumber",
      "reason",
      "correctedAt",
      "previousValues",
      "revisedValues",
    ];
    const values = await prisma.expenseRevision.findMany({
      where: { companyId },
      include: { expense: { select: { expenseNumber: true } } },
      orderBy: [{ expenseId: "asc" }, { revisionNumber: "asc" }],
    });
    rows = values.map((item) => ({
      ...item,
      expenseNumber: item.expense.expenseNumber,
      previousValues: JSON.stringify(item.previousValues),
      revisedValues: JSON.stringify(item.revisedValues),
    }));
  }
  if (kind === "operational-sources") {
    columns = [
      "sourceType",
      "sourceRecordId",
      "transactionDate",
      "description",
      "totalCents",
      "reviewStatus",
      "fuelEntryId",
      "maintenanceRecordId",
    ];
    rows = await prisma.businessExpense.findMany({
      where: { companyId, sourceRecordId: { not: null } },
      orderBy: { transactionDate: "asc" },
    });
  }
  if (kind === "asset-purchases") {
    columns = [
      "assetNumber",
      "name",
      "category",
      "purchaseDate",
      "purchasePriceCents",
      "ownershipType",
      "status",
    ];
    rows = await prisma.fleetAsset.findMany({
      where: { companyId, purchaseDate: { not: null } },
      orderBy: { purchaseDate: "asc" },
    });
  }
  const csv = createCsv(columns, rows);
  await prisma.auditEvent.create({
    data: {
      companyId,
      actingUserId: userId,
      eventType: `finance.export.${kind}`,
      entityType: "FinanceExport",
      metadata: { kind, rowCount: rows.length },
    },
  });
  return csv;
}

export async function listFinanceDocuments(companyId: string) {
  return prisma.financeDocument.findMany({
    where: { companyId },
    include: {
      expense: { select: { id: true, expenseNumber: true } },
      vendor: { select: { id: true, name: true } },
      job: { select: { id: true, jobNumber: true } },
      asset: { select: { id: true, assetNumber: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function attachFinanceDocument(
  companyId: string,
  userId: string,
  input: {
    id: string;
    category:
      | "Receipt"
      | "Invoice"
      | "CreditMemo"
      | "Statement"
      | "Contract"
      | "Warranty"
      | "TaxDocument"
      | "PaymentConfirmation"
      | "Other";
    expenseId?: string;
    vendorId?: string;
    jobId?: string;
    assetId?: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    transactionDate?: Date;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const [expense, vendor, job, asset] = await Promise.all([
      input.expenseId
        ? tx.businessExpense.findFirst({
            where: { id: input.expenseId, companyId },
          })
        : null,
      input.vendorId
        ? tx.vendor.findFirst({ where: { id: input.vendorId, companyId } })
        : null,
      input.jobId
        ? tx.job.findFirst({ where: { id: input.jobId, companyId } })
        : null,
      input.assetId
        ? tx.fleetAsset.findFirst({ where: { id: input.assetId, companyId } })
        : null,
    ]);
    if (input.expenseId && !expense) throw new Error("Expense not found.");
    if (input.vendorId && !vendor) throw new Error("Vendor not found.");
    if (input.jobId && !job) throw new Error("Job not found.");
    if (input.assetId && !asset) throw new Error("Asset not found.");
    const document = await tx.financeDocument.create({
      data: { ...input, companyId, uploadedById: userId },
    });
    await audit(
      tx,
      companyId,
      userId,
      "finance.document.uploaded",
      "FinanceDocument",
      document.id,
      { category: document.category },
    );
    return document;
  });
}

export async function getFinanceDocumentAccess(
  companyId: string,
  documentId: string,
) {
  return prisma.financeDocument.findFirst({
    where: { id: documentId, companyId },
    select: {
      id: true,
      storageKey: true,
      originalFilename: true,
      mimeType: true,
    },
  });
}

export async function getFinanceFormOptions(companyId: string) {
  await ensureSystemExpenseCategories(companyId);
  const [categories, vendors, jobs, customers, employees, crews, assets] =
    await Promise.all([
      prisma.expenseCategory.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.vendor.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.job.findMany({
        where: { companyId },
        select: { id: true, jobNumber: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      prisma.customer.findMany({
        where: { companyId },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 250,
      }),
      prisma.employee.findMany({
        where: { companyId, status: { not: "Terminated" } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.crew.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.fleetAsset.findMany({
        where: { companyId },
        select: { id: true, assetNumber: true, name: true, category: true },
        orderBy: { assetNumber: "asc" },
      }),
    ]);
  return { categories, vendors, jobs, customers, employees, crews, assets };
}

export async function listJobCostingRows(companyId: string) {
  const jobs = await prisma.job.findMany({
    where: { companyId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Promise.all(jobs.map((job) => getJobCostSummary(companyId, job.id)));
}
