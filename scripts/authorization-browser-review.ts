import bcrypt from "bcryptjs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";
import { hashPortalToken, PORTAL_COOKIE } from "../src/lib/portal/tokens";

const baseUrl = process.env.AUTHORIZATION_REVIEW_BASE_URL ?? "http://127.0.0.1:3110";
const browserPath = process.env.AUTHORIZATION_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = "AuthorizationReview!123";
const deniedCopy = "You do not have permission to use this feature. Contact your manager or company administrator if you believe you need access.";
const runId = Date.now().toString(36);
const portalToken = `authorization-review-portal-session-${runId}`;
const emails = {
  manager: `authorization-manager-${runId}@test.invalid`,
  office: `authorization-office-${runId}@test.invalid`,
  crew: `authorization-crew-${runId}@test.invalid`,
};

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.toLowerCase().includes("test"))
    throw new Error("Authorization review requires a disposable local test database.");
}

async function seed() {
  assertDisposableDatabase();
  const company = await prisma.company.create({
    data: {
      name: `Authorization Browser Review ${runId}`,
      displayName: "Authorization Review",
      settings: { create: { portalShowAssignedCrew: true } },
      onboarding: { create: { currentStep: 10, completedAt: new Date() } },
    },
  });
  const passwordHash = await bcrypt.hash(password, 10);
  const users: Record<string, { id: string }> = {};
  for (const [key, role, legacyRole] of [
    ["manager", "Manager", "MANAGER"],
    ["office", "Office", "OFFICE"],
    ["crew", "Crew", "CREW_MEMBER"],
  ] as const) {
    const user = await prisma.user.create({
      data: { companyId: company.id, email: emails[key], passwordHash, role: legacyRole, active: true },
      select: { id: true },
    });
    await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role } });
    users[key] = user;
  }
  const crewEmployee = await prisma.employee.create({
    data: {
      companyId: company.id, userId: users.crew.id, firstName: "Field", lastName: "Crew",
      role: "CrewMember", status: "Active",
    },
  });
  const assignedCrew = await prisma.crew.create({ data: { companyId: company.id, name: "Assigned Crew" } });
  await prisma.crewMember.create({ data: { crewId: assignedCrew.id, employeeId: crewEmployee.id } });
  const pricing = await prisma.pricingProfile.create({
    data: { companyId: company.id, name: "Standard", defaultProfile: true },
  });
  const customer = await prisma.customer.create({
    data: { companyId: company.id, firstName: "Portal", lastName: "Customer", phone: "555-0110" },
  });
  const property = await prisma.property.create({
    data: { customerId: customer.id, address: "10 Review Way", city: "Albany", state: "NY", zip: "12207" },
  });
  const estimate = await prisma.estimate.create({
    data: {
      companyId: company.id, pricingProfileId: pricing.id, customerId: customer.id,
      propertyId: property.id, displayNumber: `EST-AUTH-${runId}`, status: "Scheduled",
      pricingSubtotal: 100, pricingTotal: 100,
    },
  });
  const job = await prisma.job.create({
    data: {
      companyId: company.id, estimateId: estimate.id, customerId: customer.id,
      propertyId: property.id, status: "Scheduled", scheduledStart: new Date(Date.now() + 3_600_000),
    },
  });
  await prisma.jobAssignment.create({
    data: { companyId: company.id, jobId: job.id, employeeId: crewEmployee.id, status: "Assigned" },
  });
  const makeAsset = (name: string, assetNumber: string) => prisma.fleetAsset.create({
    data: {
      companyId: company.id, type: "Truck", category: "Vehicle", name, assetNumber,
      purchasePriceCents: 987654, replacementValueCents: 1234567,
    },
  });
  const employeeAsset = await makeAsset("Employee Assigned Asset", "AUTH-E");
  const crewAsset = await makeAsset("Crew Assigned Asset", "AUTH-C");
  const jobAsset = await makeAsset("Job Assigned Asset", "AUTH-J");
  const unrelatedAsset = await makeAsset("Unrelated Company Asset", "AUTH-X");
  await prisma.assetAssignment.create({
    data: {
      companyId: company.id, assetId: employeeAsset.id, assigneeType: "Employee",
      employeeId: crewEmployee.id, assignedById: users.manager.id, startingCondition: "Good",
    },
  });
  await prisma.assetAssignment.create({
    data: {
      companyId: company.id, assetId: crewAsset.id, assigneeType: "Crew",
      crewId: assignedCrew.id, assignedById: users.manager.id, startingCondition: "Good",
    },
  });
  await prisma.jobVehicleAssignment.create({
    data: { companyId: company.id, jobId: job.id, fleetAssetId: jobAsset.id, assignedById: users.manager.id },
  });
  await prisma.fuelEntry.create({
    data: {
      companyId: company.id, assetId: employeeAsset.id, createdById: users.manager.id,
      transactionAt: new Date(), gallons: 10, totalCostCents: 5555,
      pricePerGallonCents: 556, fullTank: true,
    },
  });
  await prisma.assetMaintenanceRecord.create({
    data: {
      companyId: company.id, assetId: employeeAsset.id, createdById: users.manager.id,
      serviceType: "Secret Cost Service", serviceDate: new Date(),
      description: "Review", totalCostCents: 7777,
    },
  });
  const access = await prisma.customerPortalAccess.create({
    data: { companyId: company.id, customerId: customer.id, email: `authorization-customer-${runId}@test.invalid` },
  });
  await prisma.customerPortalSession.create({
    data: { portalAccessId: access.id, tokenHash: hashPortalToken(portalToken), expiresAt: new Date(Date.now() + 86_400_000) },
  });
  return { employeeAsset, crewAsset, jobAsset, unrelatedAsset };
}

async function login(context: BrowserContext, email: string) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(750);
  await page.locator("#sign-in-email").fill(email);
  await page.locator("#sign-in-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"));
  return page;
}

async function assertNoOverflow(page: Page, label: string) {
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  if (size.content > size.viewport) throw new Error(`${label} horizontally overflows.`);
}

async function navLabels(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll(".app-sidebar nav a").length > 0);
  return page.locator(".app-sidebar nav a").allTextContents();
}

async function allowed(page: Page, route: string) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`${route} expected allowed, received ${response?.status()}.`);
  if ((await page.locator("body").innerText()).includes(deniedCopy))
    throw new Error(`${route} unexpectedly rendered access denied.`);
}

async function denied(page: Page, route: string) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  if (response?.status() !== 403) throw new Error(`${route} expected 403, received ${response?.status()}.`);
  await page.getByText(deniedCopy, { exact: true }).waitFor();
  await assertNoOverflow(page, route);
}

async function reviewInternalRole(role: "manager" | "office") {
  const browser = await chromium.launch({ executablePath: browserPath });
  const context = await browser.newContext();
  try {
    const page = await login(context, emails[role]);
    for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      await allowed(page, "/dashboard");
      const labels = await navLabels(page);
      if (role === "manager") {
        for (const label of ["Dispatch", "Communications"])
          if (!labels.includes(label)) throw new Error(`Manager navigation is missing ${label}.`);
        for (const label of ["Tax Center", "Billing", "Finance", "Pricing Intelligence", "Company Hub"])
          if (labels.includes(label)) throw new Error(`Manager navigation exposes ${label}.`);
        await allowed(page, "/dispatch");
        await allowed(page, "/communications");
        for (const route of ["/tax", "/settings/billing", "/finance", "/analytics/pricing", "/settings/company"])
          await denied(page, route);
      } else {
        for (const label of ["Customers", "Properties", "Estimates", "Schedule", "Communications", "Invoices"])
          if (!labels.includes(label)) throw new Error(`Office navigation is missing ${label}.`);
        for (const label of ["Finance", "Tax Center", "Billing", "Company Hub"])
          if (labels.includes(label)) throw new Error(`Office navigation exposes ${label}.`);
        for (const route of ["/customers", "/properties", "/estimates", "/schedule", "/communications", "/invoices"])
          await allowed(page, route);
        for (const route of ["/finance", "/tax", "/settings/billing", "/settings/company/documents"])
          await denied(page, route);
      }
      await assertNoOverflow(page, `${role}-${width}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

async function reviewCustomer() {
  const browser = await chromium.launch({ executablePath: browserPath });
  const context = await browser.newContext();
  try {
    await context.addCookies([{ name: PORTAL_COOKIE, value: portalToken, url: baseUrl, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      await allowed(page, "/portal");
      if ((await page.locator(".app-sidebar").count()) !== 0)
        throw new Error("Customer Portal exposes internal navigation.");
      await denied(page, "/dashboard");
      await assertNoOverflow(page, `customer-${width}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

async function reviewCrewFleet(fixture: Awaited<ReturnType<typeof seed>>) {
  const browser = await chromium.launch({ executablePath: browserPath });
  const context = await browser.newContext();
  try {
    const page = await login(context, emails.crew);
    for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      await allowed(page, "/fleet/assets");
      const body = await page.locator("body").innerText();
      for (const name of ["Employee Assigned Asset", "Crew Assigned Asset", "Job Assigned Asset"])
        if (!body.includes(name)) throw new Error(`Crew is missing ${name}.`);
      if (body.includes("Unrelated Company Asset")) throw new Error("Crew can browse an unrelated company asset.");
      if (/\$9,?876\.54|\$55\.55|\$77\.77|Purchase price|Maintenance cost|Fuel cost/.test(body))
        throw new Error("Crew fleet directory exposes cost data.");
      await denied(page, `/fleet/${fixture.unrelatedAsset.id}`);
      await allowed(page, `/fleet/${fixture.employeeAsset.id}`);
      const detail = await page.locator("body").innerText();
      if (/\$55\.55|\$77\.77|Purchase price|Maintenance cost|Fuel cost/.test(detail))
        throw new Error("Crew asset detail exposes cost data.");
      await assertNoOverflow(page, `crew-fleet-${width}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const fixture = await seed();
  try {
    const phase = process.env.AUTHORIZATION_REVIEW_PHASE ?? "all";
    if (phase === "all" || phase === "manager") await reviewInternalRole("manager");
    if (phase === "all" || phase === "office") await reviewInternalRole("office");
    if (phase === "all" || phase === "customer") await reviewCustomer();
    if (phase === "all" || phase === "crew") await reviewCrewFleet(fixture);
    console.log(JSON.stringify({
      manager: "passed", office: "passed", customer: "passed",
      crewFleet: "passed", viewports: ["390x844", "1366x768", "1920x1080"],
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
