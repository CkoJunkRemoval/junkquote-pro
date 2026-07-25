/**
 * Authenticated Company Hub browser review.
 * Requires an already migrated, disposable local test database and local server.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { chromium, type Browser, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl =
  process.env.COMPANY_HUB_REVIEW_BASE_URL ?? "http://127.0.0.1:3104";
const browserPath =
  process.env.COMPANY_HUB_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = "CompanyHubReview!123";
const emails = {
  owner: "company-hub-owner@test.invalid",
  admin: "company-hub-admin@test.invalid",
  crew: "company-hub-crew@test.invalid",
  empty: "company-hub-empty@test.invalid",
};
const routes = [
  ["/settings/company", "Company Overview"],
  ["/settings/company/branding", "Branding"],
  ["/settings/company/locations", "Business Locations"],
  ["/settings/company/service-areas", "Service Areas"],
  ["/settings/company/documents", "Company Documents"],
  ["/settings/company/notifications", "Notification Center"],
  ["/settings/company/defaults", "Operational Defaults"],
  ["/settings/company/permissions", "Permission Overview"],
  ["/settings/company/subscription", "Subscription"],
] as const;

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.toLowerCase().includes("test")
  )
    throw new Error(
      "Company Hub review requires a disposable local test database.",
    );
}

async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany({
    where: { name: { startsWith: "Company Hub Review" } },
  });
  const populated = await prisma.company.create({
    data: {
      name: "Company Hub Review Co",
      legalName: "Company Hub Review LLC",
      displayName: "Company Hub Review",
      dbaName: "Hub Hauling",
      phone: "555-0100",
      email: "office@test.invalid",
      timezone: "America/New_York",
      settings: { create: { dateFormat: "MM/DD/YYYY", serviceRadiusMiles: 30 } },
      onboarding: {
        create: { currentStep: 10, completedAt: new Date() },
      },
      businessLocations: {
        create: {
          name: "North Yard",
          addressLine1: "1 Test Way",
          city: "Albany",
          state: "NY",
          postalCode: "12207",
        },
      },
      serviceAreaRules: {
        create: {
          kind: "ZIP",
          value: "12207",
          distanceCharge: 15,
        },
      },
      companyDocuments: {
        create: {
          category: "Insurance",
          name: "coverage.pdf",
          objectKey: "company-documents/secret-review-key/coverage.pdf",
          contentType: "application/pdf",
          sizeBytes: 2048,
          uploadedById: "review-fixture",
        },
      },
      subscription: {
        create: {
          plan: "Professional",
          status: "Active",
          currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
          currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
        },
      },
      featureFlags: {
        create: { key: "company-hub-review", enabled: true },
      },
      usageMetrics: {
        create: {
          date: new Date("2026-07-24T00:00:00Z"),
          activeUsers: 2,
          estimates: 4,
          jobs: 3,
          emails: 5,
          storageBytes: 2048,
        },
      },
    },
  });
  const empty = await prisma.company.create({
    data: {
      name: "Company Hub Review Empty",
      displayName: "Other Tenant Secret",
      onboarding: { create: { currentStep: 10, completedAt: new Date() } },
    },
  });
  for (const [email, role, companyId, userRole] of [
    [emails.owner, "Owner", populated.id, "OWNER"],
    [emails.admin, "Admin", populated.id, "OWNER"],
    [emails.crew, "Crew", populated.id, "CREW_MEMBER"],
    [emails.empty, "Admin", empty.id, "OWNER"],
  ] as const) {
    const user = await prisma.user.create({
      data: {
        companyId,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: userRole,
        active: true,
      },
    });
    await prisma.companyMembership.create({
      data: { companyId, userId: user.id, role },
    });
  }
}

async function login(page: Page, email: string) {
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await page.request.post(
    `${baseUrl}/api/auth/callback/credentials`,
    {
      form: {
        csrfToken,
        email,
        password,
        callbackUrl: `${baseUrl}/settings/company`,
      },
    },
  );
  if (!response.ok())
    throw new Error(`Authenticated login failed: ${response.status()}`);
}

async function newPage(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return page;
}

async function reviewRoute(
  page: Page,
  route: string,
  heading: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);
  await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  const selected = page.locator('nav[aria-label="Company Hub"] [aria-current="page"]');
  if ((await selected.count()) !== 1)
    throw new Error(`${route} does not expose one selected navigation item.`);
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    body: document.body.innerText,
  }));
  if (layout.content > layout.viewport)
    throw new Error(`${route} overflows at ${width}x${height}.`);
  if (
    layout.body.includes("company-documents/") ||
    layout.body.includes("secret-review-key")
  )
    throw new Error(`${route} exposes a private storage key.`);
  if (layout.body.includes("Other Tenant Secret"))
    throw new Error(`${route} exposes another tenant.`);
  if (width === 390) {
    const undersized = await page
      .locator("button:visible, a:visible, input:visible, select:visible, textarea:visible")
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const box = element.getBoundingClientRect();
            const labelBox = element.closest("label")?.getBoundingClientRect();
            return {
              label:
                element.getAttribute("aria-label") ||
                element.textContent?.trim().slice(0, 40),
              width: Math.max(box.width, labelBox?.width ?? 0),
              height: Math.max(box.height, labelBox?.height ?? 0),
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
        `${route} undersized targets: ${JSON.stringify(undersized)}`,
      );
  }
  const slug = route === "/settings/company" ? "overview" : route.split("/").at(-1);
  const screenshot = join(
    tmpdir(),
    `junkquote-company-hub-${slug}-${width}x${height}.png`,
  );
  await page.screenshot({ path: screenshot, fullPage: true });
  return screenshot;
}

async function main() {
  await seed();
  const browser = await chromium.launch({ executablePath: browserPath });
  try {
    const ownerPage = await newPage(browser, emails.owner);
    const screenshots: string[] = [];
    for (const [width, height] of [
      [390, 844],
      [1366, 768],
      [1920, 1080],
    ] as const)
      for (const [route, heading] of routes)
        screenshots.push(
          await reviewRoute(ownerPage, route, heading, width, height),
        );

    await ownerPage.goto(`${baseUrl}/settings/company/documents`);
    if (
      !(await ownerPage
        .getByRole("button", { name: "Upload unavailable" })
        .isDisabled())
    )
      throw new Error("Private document upload is not disabled.");
    await ownerPage.goto(`${baseUrl}/settings/company/locations`);
    await ownerPage.getByRole("button", { name: "Add location" }).click();
    if ((await ownerPage.locator("input:invalid").count()) === 0)
      throw new Error("Required location fields do not expose error state.");
    await ownerPage.keyboard.press("Tab");
    if (!(await ownerPage.evaluate(() => document.activeElement !== document.body)))
      throw new Error("Keyboard focus was not visible.");

    const adminPage = await newPage(browser, emails.admin);
    await reviewRoute(
      adminPage,
      "/settings/company",
      "Company Overview",
      1366,
      768,
    );

    const emptyPage = await newPage(browser, emails.empty);
    await emptyPage.goto(`${baseUrl}/settings/company/locations`);
    await emptyPage.getByText("No locations configured.").waitFor();
    await emptyPage.goto(`${baseUrl}/settings/company/documents`);
    await emptyPage.getByText(/Document listing is unavailable/).waitFor();

    const crewPage = await newPage(browser, emails.crew);
    const crewResponse = await crewPage.goto(`${baseUrl}/settings/company`);
    if (crewResponse?.ok())
      throw new Error("Crew unexpectedly received Company Hub access.");

    console.log(
      JSON.stringify(
        {
          authenticated: true,
          owner: "all routes and viewports passed",
          admin: "authorized",
          crew: "denied",
          tenantIsolation: "passed",
          emptyAndPopulatedStates: "passed",
          documentUpload: "disabled",
          screenshots,
        },
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
