import { chromium, type Page } from "playwright-core";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.PLATFORM_ADMIN_REVIEW_BASE_URL ?? "http://127.0.0.1:3112";
const browserPath = process.env.PLATFORM_ADMIN_REVIEW_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = "PlatformReview!123";
const adminEmail = "platform-review@test.invalid";
const ownerEmail = "ordinary-owner-review@test.invalid";
const routes = ["/platform-admin", "/platform-admin/companies", "/platform-admin/activation", "/platform-admin/usage", "/platform-admin/subscriptions", "/platform-admin/conversions"];
const viewports = [{ width: 390, height: 844 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }];

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.toLowerCase().includes("test"))
    throw new Error("Platform admin browser review requires a disposable local test database.");
}
async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany({ where: { name: { startsWith: "Platform Review" } } });
  const company = await prisma.company.create({ data: {
    name: "Platform Review Company", onboarding: { create: { completedAt: new Date() } },
    subscription: { create: { plan: "Professional", status: "Active" } },
    usageMetrics: { create: { date: new Date(), activeUsers: 1, estimates: 3, jobs: 2 } },
  } });
  for (const [email, platformAdmin] of [[adminEmail, true], [ownerEmail, false]] as const) {
    const user = await prisma.user.create({ data: { companyId: company.id, email, passwordHash: await bcrypt.hash(password, 10), role: "OWNER", platformAdmin } });
    await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role: "Owner" } });
  }
  await prisma.auditEvent.create({ data: { companyId: company.id, actingUserId: (await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } })).id, eventType: "estimate.created", entityType: "Estimate" } });
}
async function login(page: Page, email: string) {
  const csrf = await page.request.get(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrf.json() as { csrfToken: string };
  const response = await page.request.post(`${baseUrl}/api/auth/callback/credentials`, { form: { csrfToken, email, password, callbackUrl: `${baseUrl}/platform-admin` } });
  if (!response.ok()) throw new Error(`Login failed for ${email}: ${response.status()}`);
}
async function layout(page: Page, route: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);
  await page.getByRole("heading", { name: "JunkQuote Pro Platform Administration" }).waitFor();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  if (dimensions.content > dimensions.viewport) throw new Error(`${route} overflows at ${width}x${height}`);
  if (width === 390) {
    const undersized = await page.locator("a:visible, button:visible, input:visible, select:visible").evaluateAll((elements) => elements.filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width < 44 || box.height < 44;
    }).map((element) => element.textContent?.trim() || element.getAttribute("name")));
    if (undersized.length) throw new Error(`${route} has undersized targets: ${JSON.stringify(undersized)}`);
  }
}
async function main() {
  await seed();
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const admin = await browser.newPage(); await login(admin, adminEmail);
    for (const viewport of viewports) for (const route of routes) await layout(admin, route, viewport.width, viewport.height);
    const owner = await browser.newPage(); await login(owner, ownerEmail);
    const denied = await owner.goto(`${baseUrl}/platform-admin`, { waitUntil: "networkidle" });
    if (denied?.status() !== 403) throw new Error(`Ordinary owner denial returned ${denied?.status()}`);
    const exportDenied = await owner.request.get(`${baseUrl}/api/platform-admin/exports/companies`);
    if (exportDenied.status() !== 403) throw new Error(`Ordinary owner export returned ${exportDenied.status()}`);
    console.log(`Platform admin browser review passed ${routes.length * viewports.length} authorized route/viewport checks plus Owner page/export denials.`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
