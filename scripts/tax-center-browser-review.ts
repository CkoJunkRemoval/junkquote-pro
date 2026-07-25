/**
 * Optional authenticated Tax Center browser review.
 * Production TypeScript excludes this file; validate with
 * npm run typecheck:tax-center-browser-review.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.TAX_REVIEW_BASE_URL ?? "http://127.0.0.1:3103";
const edgePath = process.env.TAX_REVIEW_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = "tax-review@test.invalid";
const password = "TaxReview!123";

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.toLowerCase().includes("test"))
    throw new Error("Tax Center review requires a local disposable test database.");
}

async function seed() {
  assertDisposableDatabase();
  await prisma.taxChecklistItem.deleteMany();
  await prisma.taxDocument.deleteMany();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({ data: { name: "Tax Review Co", displayName: "Tax Review Co", onboarding: { create: { currentStep: 10, completedSections: ["profile", "branding", "pricing", "service-area", "team", "equipment", "preferences", "communication", "demo"], completedAt: new Date() } } } });
  const user = await prisma.user.create({ data: { companyId: company.id, email, passwordHash: await bcrypt.hash(password, 10), role: "OWNER", firstName: "Tax", lastName: "Reviewer" } });
  await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role: "Owner" } });
}

async function login(page: Page) {
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await page.request.post(`${baseUrl}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password, callbackUrl: `${baseUrl}/tax` },
  });
  if (!response.ok()) throw new Error(`Authenticated review login failed: ${response.status()}`);
  await page.goto(`${baseUrl}/tax`, { waitUntil: "networkidle" });
  if (new URL(page.url()).pathname.includes("sign-in")) throw new Error("Authenticated review did not establish a session.");
}

async function review(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  for (const [route, heading] of [["/tax", "Tax Center"], ["/tax/documents", "Tax Documents"], ["/tax/mileage", "Mileage Archive"], ["/tax/assets", "Asset Purchase Archive"], ["/tax/payroll", "Payroll Summaries"], ["/tax/vendors", "Vendor Reporting"], ["/tax/checklist", "Year-End Checklist"], ["/tax/exports", "Accountant Exports"]]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: new RegExp(heading) }).waitFor();
    const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    if (overflow.content > overflow.viewport) throw new Error(`${route} overflow at ${width}x${height}`);
    if (width === 390) {
      const undersized = await page.locator("button:visible, a:visible, input:visible, select:visible").evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 40), width: box.width, height: box.height };
      }).filter((box) => box.label !== "Open Next.js Dev Tools" && (box.width < 44 || box.height < 44)));
      if (undersized.length) throw new Error(`${route} undersized targets: ${JSON.stringify(undersized)}`);
    }
  }
  const screenshot = join(tmpdir(), `junkquote-tax-${width}x${height}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  return screenshot;
}

async function main() {
  await seed();
  const browser = await chromium.launch({ executablePath: edgePath });
  try {
    const page = await browser.newPage();
    await login(page);
    const screenshots = [];
    for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]]) screenshots.push(await review(page, width, height));
    await page.keyboard.press("Home"); await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? null);
    if (!focused) throw new Error("Keyboard focus was not available.");
    console.log(JSON.stringify({ authenticated: true, viewports: "passed", focused, screenshots }, null, 2));
  } finally { await browser.close(); await prisma.$disconnect(); }
}
void main();
