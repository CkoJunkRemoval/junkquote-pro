/**
 * Optional authenticated finance browser review.
 *
 * The production TypeScript graph excludes this file. Validate it with:
 * npm run typecheck:finance-browser-review
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.FINANCE_REVIEW_BASE_URL ?? "http://127.0.0.1:3102";
const edgePath =
  process.env.FINANCE_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = "finance-review@test.invalid";
const password = "FinanceReview!123";

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.toLowerCase().includes("test")
  )
    throw new Error("Finance review requires a local disposable test database.");
}

async function seed() {
  assertDisposableDatabase();
  await prisma.financeDocument.deleteMany();
  await prisma.expenseAllocation.deleteMany();
  await prisma.expenseRevision.deleteMany();
  await prisma.businessExpense.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.manualIncomeAdjustment.deleteMany();
  await prisma.financialPeriod.deleteMany();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({
    data: {
      name: "Finance Review Co",
      displayName: "Finance Review Co",
      onboarding: {
        create: {
          currentStep: 10,
          completedSections: [
            "profile",
            "branding",
            "pricing",
            "service-area",
            "team",
            "equipment",
            "preferences",
            "communication",
            "demo",
          ],
          completedAt: new Date(),
        },
      },
    },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
      firstName: "Finance",
      lastName: "Reviewer",
    },
  });
  await prisma.companyMembership.create({
    data: { companyId: company.id, userId: user.id, role: "Owner" },
  });
  const category = await prisma.expenseCategory.create({
    data: {
      companyId: company.id,
      name: "Fuel",
      code: "FUEL",
      isSystem: true,
    },
  });
  const vendor = await prisma.vendor.create({
    data: {
      companyId: company.id,
      name: "Review Fuel",
      normalizedName: "review fuel",
      type: "FUEL_STATION",
    },
  });
  await prisma.businessExpense.createMany({
    data: [
      {
        companyId: company.id,
        expenseNumber: 1,
        transactionDate: new Date(),
        vendorId: vendor.id,
        categoryId: category.id,
        description: "Truck fuel",
        subtotalCents: 8_000,
        totalCents: 8_000,
        reviewStatus: "Approved",
        createdById: user.id,
      },
      {
        companyId: company.id,
        expenseNumber: 2,
        transactionDate: new Date(),
        vendorId: vendor.id,
        categoryId: category.id,
        description: "Receipt pending",
        subtotalCents: 4_000,
        totalCents: 4_000,
        reviewStatus: "NeedsReview",
        createdById: user.id,
      },
    ],
  });
  await prisma.recurringExpense.create({
    data: {
      companyId: company.id,
      vendorId: vendor.id,
      categoryId: category.id,
      description: "Fuel card service",
      cadence: "Monthly",
      expectedAmountCents: 2_500,
      nextDueDate: new Date(Date.now() + 7 * 86_400_000),
      startDate: new Date(),
    },
  });
  return (
    await prisma.businessExpense.findUniqueOrThrow({
      where: {
        companyId_expenseNumber: { companyId: company.id, expenseNumber: 1 },
      },
      select: { id: true },
    })
  ).id;
}

async function login(page: Page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_500);
  await page.locator("#sign-in-email").fill(email);
  await page.locator("#sign-in-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"));
}

async function reviewViewport(
  page: Page,
  width: number,
  height: number,
  expenseId: string,
) {
  await page.setViewportSize({ width, height });
  for (const [route, heading] of [
    ["/finance", "Finance overview"],
    ["/finance/expenses", "Expenses"],
    ["/finance/expenses/new", "Add expense"],
    [`/finance/expenses/${expenseId}`, "Expense #1"],
    ["/finance/receipts", "Receipts & documents"],
    ["/finance/vendors", "Vendors"],
    ["/finance/recurring", "Recurring obligations"],
    ["/finance/job-costing", "Operational job costing"],
    ["/finance/periods", "Reporting periods"],
  ]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: heading }).waitFor();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    if (overflow.content > overflow.viewport)
      throw new Error(`${route} overflow at ${width}x${height}`);
    if (width === 390) {
      const undersized = await page
        .locator("button:visible, a:visible, input:visible, select:visible")
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const target =
                element instanceof HTMLInputElement &&
                ["checkbox", "radio"].includes(element.type)
                  ? element.closest("label") ?? element
                  : element;
              const box = target.getBoundingClientRect();
              return {
                label:
                  element.getAttribute("aria-label") ||
                  element.textContent?.trim().slice(0, 40),
                width: box.width,
                height: box.height,
              };
            })
            .filter(
              (box) =>
                box.label !== "Open Next.js Dev Tools" &&
                (box.width < 44 || box.height < 44),
            ),
        );
      if (undersized.length)
        throw new Error(
          `${route} undersized touch targets: ${JSON.stringify(undersized)}`,
        );
    }
  }
  await page.goto(`${baseUrl}/finance`, { waitUntil: "domcontentloaded" });
  const screenshot = join(tmpdir(), `junkquote-finance-${width}x${height}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return screenshot;
}

async function main() {
  const expenseId = await seed();
  const browser = await chromium.launch({ executablePath: edgePath });
  try {
    const page = await browser.newPage();
    await login(page);
    const screenshots = [];
    for (const [width, height] of [
      [390, 844],
      [1366, 768],
      [1920, 1080],
    ]) {
      screenshots.push(await reviewViewport(page, width, height, expenseId));
    }
    await page.keyboard.press("Home");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.tagName ?? null,
    );
    if (!focused) throw new Error("Keyboard focus was not available.");
    console.log(
      JSON.stringify(
        { authenticated: true, viewports: "passed", focused, screenshots },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

void main();
