/**
 * Authenticated customer portal browser review.
 * Requires a migrated disposable local test database and a local server.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { prisma } from "../src/lib/prisma";
import { hashPortalToken, PORTAL_COOKIE } from "../src/lib/portal/tokens";

const baseUrl = process.env.PORTAL_REVIEW_BASE_URL ?? "http://127.0.0.1:3105";
const browserPath = process.env.PORTAL_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const rawSession = "customer-portal-browser-review-session";

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.toLowerCase().includes("test"))
    throw new Error("Portal review requires a disposable local test database.");
}

async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany({ where: { name: { startsWith: "Portal Browser Review" } } });
  const company = await prisma.company.create({
    data: {
      name: "Portal Browser Review Co",
      displayName: "Portal Browser Review",
      settings: { create: { portalShowAssignedCrew: true } },
    },
  });
  const profile = await prisma.pricingProfile.create({ data: { companyId: company.id, name: "Standard", defaultProfile: true } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email: "portal-browser-owner@test.invalid", passwordHash: "review-only", role: "OWNER" } });
  const customer = await prisma.customer.create({ data: { companyId: company.id, firstName: "Portal", lastName: "Customer", phone: "555-0100" } });
  const property = await prisma.property.create({ data: { customerId: customer.id, address: "1 Review Way", city: "Albany", state: "NY", zip: "12207" } });
  const estimate = await prisma.estimate.create({
    data: { companyId: company.id, pricingProfileId: profile.id, customerId: customer.id, propertyId: property.id, displayNumber: "EST-REVIEW", status: "Sent", pricingSubtotal: 100, pricingTotal: 125, approvalTokenExpiresAt: new Date(Date.now() + 86_400_000) },
  });
  const site = await prisma.jobSite.create({ data: { estimateId: estimate.id, name: "Garage", sortOrder: 0 } });
  await prisma.estimateItem.create({ data: { jobSiteId: site.id, itemId: "review-item", name: "Household items", category: "General", quantity: 1, basePrice: 100, sortOrder: 0 } });
  const job = await prisma.job.create({ data: { companyId: company.id, estimateId: estimate.id, customerId: customer.id, propertyId: property.id, status: "Scheduled", scheduledStart: new Date(Date.now() + 86_400_000) } });
  const invoice = await prisma.invoice.create({ data: { companyId: company.id, customerId: customer.id, propertyId: property.id, estimateId: estimate.id, jobId: job.id, invoiceNumber: 88001, displayNumber: "INV-REVIEW", subtotal: 125, total: 125, balanceDue: 100, status: "Partial" } });
  await prisma.invoiceLineItem.create({ data: { invoiceId: invoice.id, description: "Junk removal", quantity: 1, unitPrice: 125, amount: 125, sortOrder: 0 } });
  await prisma.payment.create({ data: { companyId: company.id, invoiceId: invoice.id, amount: 25, method: "Cash", paymentDate: new Date() } });
  await prisma.servicePlan.create({ data: { companyId: company.id, customerId: customer.id, propertyId: property.id, name: "Quarterly pickup", recurrenceType: "Monthly", interval: 3, daysOfWeek: [], status: "Active", startDate: new Date(), createdByUserId: owner.id } });
  const access = await prisma.customerPortalAccess.create({ data: { companyId: company.id, customerId: customer.id, email: "portal-review@test.invalid" } });
  await prisma.customerPortalSession.create({ data: { portalAccessId: access.id, tokenHash: hashPortalToken(rawSession), expiresAt: new Date(Date.now() + 86_400_000) } });
  const other = await prisma.company.create({ data: { name: "Portal Browser Review Other", displayName: "Other Tenant Secret" } });
  return { estimate, job, invoice, other };
}

async function main() {
  const fixture = await seed();
  const browser = await chromium.launch({ executablePath: browserPath });
  try {
    const context = await browser.newContext();
    await context.addCookies([{ name: PORTAL_COOKIE, value: rawSession, url: baseUrl, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    const routes = [
      ["/portal", "Welcome, Portal"],
      ["/portal/estimates", "Estimates"],
      [`/portal/estimates/${fixture.estimate.id}`, "EST-REVIEW"],
      ["/portal/jobs", "Jobs"],
      [`/portal/jobs/${fixture.job.id}`, "Job"],
      ["/portal/invoices", "Invoices"],
      [`/portal/invoices/${fixture.invoice.id}`, "INV-REVIEW"],
      ["/portal/payments", "Payments"],
      ["/portal/messages", "Messages"],
      ["/portal/service-plans", "Service plans"],
    ] as const;
    const screenshots: string[] = [];
    for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      for (const [route, heading] of routes) {
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);
        await page.getByRole("heading", { name: heading, exact: true }).waitFor();
        const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, body: document.body.innerText }));
        if (layout.content > layout.viewport) throw new Error(`${route} overflows at ${width}x${height}.`);
        if (layout.body.includes("Other Tenant Secret") || layout.body.includes("company-documents/")) throw new Error(`${route} exposes private tenant data.`);
        if (width === 390) {
          const undersized = await page.locator("button:visible, a:visible, input:visible, select:visible, textarea:visible").evaluateAll((elements) => elements.map((element) => {
            const box = element.getBoundingClientRect(), label = element.closest("label")?.getBoundingClientRect();
            return { text: element.textContent?.trim().slice(0, 30), width: Math.max(box.width, label?.width ?? 0), height: Math.max(box.height, label?.height ?? 0) };
          }).filter((box) => box.text !== "Open Next.js Dev Tools" && (box.width < 44 || box.height < 44)));
          if (undersized.length) throw new Error(`${route} undersized targets: ${JSON.stringify(undersized)}`);
        }
        const path = join(tmpdir(), `junkquote-portal-${route.replaceAll("/", "-") || "home"}-${width}x${height}.png`);
        await page.screenshot({ path, fullPage: true });
        screenshots.push(path);
      }
    }
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => document.activeElement !== document.body))) throw new Error("Keyboard focus did not advance.");
    for (const url of [`/api/portal/estimates/${fixture.estimate.id}/pdf`, `/api/portal/invoices/${fixture.invoice.id}/pdf`]) {
      const response = await context.request.get(`${baseUrl}${url}`);
      if (!response.ok() || response.headers()["content-type"] !== "application/pdf") throw new Error(`${url} was not an authenticated PDF response.`);
      if (response.headers()["cache-control"] !== "private, no-store") throw new Error(`${url} was not private/no-store.`);
    }
    console.log(JSON.stringify({ authenticated: true, tenantIsolation: "passed", viewports: "passed", routes: routes.length, privateDocuments: "authenticated PDFs only", screenshots }, null, 2));
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

void main();
