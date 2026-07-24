/**
 * Optional local Route Intelligence browser review.
 *
 * Install its browser driver without changing package manifests:
 * npm install --no-save --package-lock=false playwright-core
 *
 * Check: npm run typecheck:route-intelligence-browser-review
 * Run:   npx tsx scripts/route-intelligence-browser-review.ts
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.ROUTE_REVIEW_BASE_URL ?? "http://127.0.0.1:3101";
const edgePath =
  process.env.ROUTE_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = "route-review@test.invalid";
const password = "RouteReview!123";

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.toLowerCase().includes("test")
  )
    throw new Error("Route review requires a local disposable test database.");
}

async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({
    data: {
      name: "Route Review Co",
      displayName: "Route Review Co",
      addressLine1: "100 Yard Way",
      city: "Richmond",
      state: "VA",
      postalCode: "23220",
      settings: {
        create: {
          routeIntelligenceSettings: {
            enabled: true,
            capacityWarningPercent: 75,
            suggestionSensitivityMiles: 1,
          },
        },
      },
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
      role: "OFFICE",
      firstName: "Route",
      lastName: "Reviewer",
    },
  });
  await prisma.companyMembership.create({
    data: { companyId: company.id, userId: user.id, role: "Office" },
  });
  const profile = await prisma.pricingProfile.create({
    data: { companyId: company.id, name: "Standard", defaultProfile: true },
  });
  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      firstName: "Browser",
      lastName: "Review",
      phone: "555-0110",
    },
  });
  const [alpha, bravo, vehicle] = await Promise.all([
    prisma.employee.create({
      data: {
        companyId: company.id,
        firstName: "Alpha",
        lastName: "Crew",
        role: "CrewLead",
      },
    }),
    prisma.employee.create({
      data: {
        companyId: company.id,
        firstName: "Bravo",
        lastName: "Crew",
        role: "CrewLead",
      },
    }),
    prisma.fleetAsset.create({
      data: {
        companyId: company.id,
        name: "Truck 14",
        type: "BoxTruck",
        capacityCubicYards: 14,
      },
    }),
  ]);
  const date = new Date();
  const at = (hour: number) => {
    const value = new Date(date);
    value.setHours(hour, 0, 0, 0);
    return value;
  };
  async function createJob(input: {
    number: string;
    zip: "23220" | "23223" | "23510";
    hour: number;
    employeeId?: string;
    volume: number;
  }) {
    const place =
      input.zip === "23510"
        ? {
            city: "Norfolk",
            latitude: 36.852414,
            longitude: -76.29148,
          }
        : {
            city: "Richmond",
            latitude: input.zip === "23220" ? 37.549349 : 37.557767,
            longitude: input.zip === "23220" ? -77.460606 : -77.378886,
          };
    const property = await prisma.property.create({
      data: {
        customerId: customer.id,
        address: `${input.number} Review Way`,
        state: "VA",
        zip: input.zip,
        ...place,
      },
    });
    const estimate = await prisma.estimate.create({
      data: {
        companyId: company.id,
        pricingProfileId: profile.id,
        customerId: customer.id,
        propertyId: property.id,
        status: "Approved",
        pricingTotal: 500,
        jobSites: {
          create: {
            name: "Main load",
            sortOrder: 0,
            items: {
              create: {
                itemId: `item-${input.number}`,
                name: "Review load",
                category: "Furniture",
                quantity: 1,
                basePrice: 500,
                estimatedVolume: input.volume,
                crewRequirement: 1,
                sortOrder: 0,
              },
            },
          },
        },
      },
    });
    return prisma.job.create({
      data: {
        companyId: company.id,
        estimateId: estimate.id,
        customerId: customer.id,
        propertyId: property.id,
        jobNumber: input.number,
        status: "Scheduled",
        schedulingStatus: "Scheduled",
        scheduledStart: at(input.hour),
        scheduledEnd: at(input.hour + 1),
        arrivalWindowStart: at(input.hour),
        arrivalWindowEnd: at(input.hour + 1),
        estimatedDurationMinutes: 60,
        timeZone: "America/New_York",
        assignments: input.employeeId
          ? {
              create: {
                companyId: company.id,
                employeeId: input.employeeId,
                role: "CrewLead",
                lead: true,
              },
            }
          : undefined,
        vehicleAssignments: input.employeeId
          ? {
              create: {
                companyId: company.id,
                fleetAssetId: vehicle.id,
                assignedById: user.id,
              },
            }
          : undefined,
      },
    });
  }
  await createJob({
    number: "RTE-101",
    zip: "23220",
    hour: 9,
    employeeId: alpha.id,
    volume: 4,
  });
  await createJob({
    number: "RTE-102",
    zip: "23510",
    hour: 11,
    employeeId: alpha.id,
    volume: 4,
  });
  await createJob({
    number: "RTE-103",
    zip: "23510",
    hour: 13,
    employeeId: alpha.id,
    volume: 4,
  });
  await createJob({
    number: "RTE-104",
    zip: "23220",
    hour: 15,
    employeeId: alpha.id,
    volume: 4,
  });
  await createJob({
    number: "RTE-201",
    zip: "23510",
    hour: 8,
    employeeId: bravo.id,
    volume: 2,
  });
  await createJob({
    number: "RTE-301",
    zip: "23223",
    hour: 17,
    volume: 3,
  });
  return { date: date.toISOString().slice(0, 10), companyId: company.id };
}

async function login(page: Page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_500);
  await page.locator("#sign-in-email").fill(email);
  await page.locator("#sign-in-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"));
}

async function openRoutes(page: Page) {
  await page.locator("details").evaluateAll((rows) => {
    for (const row of rows) (row as HTMLDetailsElement).open = true;
  });
}

async function waitForAudit(companyId: string, eventType: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const event = await prisma.auditEvent.findFirst({
      where: { companyId, eventType },
      select: { id: true },
    });
    if (event) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Audit event was not recorded: ${eventType}`);
}

async function assertDesktop(page: Page, date: string, companyId: string) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/dispatch?date=${date}&grouping=crewLead`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Route Intelligence" }).waitFor();
  for (const text of [
    "Estimated miles",
    "Drive time",
    "Utilization",
    "Capacity risks",
    "Confidence",
  ])
    await page.getByText(text, { exact: true }).first().waitFor();
  await page.waitForTimeout(1_000);
  await openRoutes(page);
  await page.getByText(/confidence/i).first().waitFor();
  await page.getByRole("button", { name: "Preview" }).first().click();
  await waitForAudit(companyId, "route.suggestion_previewed");
  await page.waitForTimeout(2_500);
  await openRoutes(page);
  await page.getByRole("button", { name: "Dismiss" }).first().click();
  await waitForAudit(companyId, "route.suggestion_dismissed");
  await page.waitForTimeout(2_500);
  await openRoutes(page);
  const applicable = page.getByRole("button", { name: "Apply" }).first();
  await applicable.click();
  await waitForAudit(companyId, "ROUTE_SUGGESTION_APPLIED");
  await page.waitForTimeout(3_000);
  await page.goto(`${baseUrl}/dispatch?date=${date}&grouping=vehicle`, {
    waitUntil: "domcontentloaded",
  });
  await openRoutes(page);
  await page.getByText(/% capacity/).first().waitFor();
  await page.getByText(/cumulative/).first().waitFor();
  await page.getByLabel("Group board").waitFor();
  await page.goto(`${baseUrl}/dispatch?date=${date}&grouping=crewLead`, {
    waitUntil: "domcontentloaded",
  });
  const path = join(tmpdir(), "junkquote-route-desktop.png");
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function assertMobile(page: Page, date: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dispatch?date=${date}&grouping=crewLead`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText("Today's route summary", { exact: true }).waitFor();
  await page.getByText("Next stop", { exact: true }).waitFor();
  await openRoutes(page);
  await page.getByText(/estimated mi|distance unavailable/).first().waitFor();
  await page.goto(`${baseUrl}/dispatch?date=${date}&grouping=vehicle`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1_000);
  await openRoutes(page);
  await page.getByText(/% capacity/).first().waitFor();
  await page.getByText("Review dump/reset stop", { exact: true }).waitFor();
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  if (layout.documentWidth > layout.viewport)
    throw new Error(`Horizontal overflow: ${JSON.stringify(layout)}`);
  const undersized = await page
    .locator(
      'button:visible, a:visible, input:visible, select:visible, summary:visible',
    )
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
              element.textContent?.trim().slice(0, 50),
            width: box.width,
            height: box.height,
            inViewport:
              box.right > 0 &&
              box.bottom > 0 &&
              box.left < innerWidth &&
              box.top < innerHeight,
          };
        })
        .filter(
          (box) =>
            box.label !== "Open Next.js Dev Tools" &&
            box.inViewport &&
            (box.width < 44 || box.height < 44),
        ),
    );
  if (undersized.length)
    throw new Error(`Touch targets below 44px: ${JSON.stringify(undersized)}`);
  await page.keyboard.press("Home");
  for (let index = 0; index < 12; index += 1) await page.keyboard.press("Tab");
  const keyboard = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    const box = active.getBoundingClientRect();
    return {
      tag: active.tagName,
      visible: box.width > 0 && box.height > 0,
      outline: getComputedStyle(active).outlineStyle,
    };
  });
  if (!keyboard?.visible)
    throw new Error(`Keyboard focus is not visible: ${JSON.stringify(keyboard)}`);
  const path = join(tmpdir(), "junkquote-route-mobile.png");
  await page.screenshot({ path, fullPage: true });
  return { path, undersized: undersized.length, keyboard };
}

async function main() {
  const seeded = await seed();
  const browser = await chromium.launch({ executablePath: edgePath });
  try {
    const page = await browser.newPage();
    await login(page);
    const desktopScreenshot = await assertDesktop(
      page,
      seeded.date,
      seeded.companyId,
    );
    const mobile = await assertMobile(page, seeded.date);
    const auditCounts = await prisma.auditEvent.groupBy({
      by: ["eventType"],
      where: {
        companyId: seeded.companyId,
        eventType: {
          in: [
            "route.suggestion_previewed",
            "route.suggestion_dismissed",
            "ROUTE_SUGGESTION_APPLIED",
          ],
        },
      },
      _count: true,
    });
    console.log(
      JSON.stringify(
        {
          desktop: "passed",
          mobile: "passed",
          viewport: "390x844",
          desktopScreenshot,
          mobileScreenshot: mobile.path,
          keyboard: mobile.keyboard,
          auditCounts,
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
