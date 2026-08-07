import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";
import { hashPortalToken, PORTAL_COOKIE } from "../src/lib/portal/tokens";

const baseUrl = process.env.STRIPE_CONNECT_REVIEW_BASE_URL ?? "http://localhost:3112";
const browserPath = process.env.STRIPE_CONNECT_REVIEW_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = "StripeConnectReview!123";
const runId = Date.now().toString(36);
const portalToken = `stripe-connect-review-${runId}`;

function safeDatabase() { const url = new URL(process.env.DATABASE_URL ?? ""); if (!['127.0.0.1','localhost'].includes(url.hostname) || !url.pathname.includes("test")) throw new Error("Review requires a disposable local test database."); }

async function seed() {
  safeDatabase();
  await prisma.company.deleteMany({ where: { name: { startsWith: "Stripe Connect Browser Review" } } });
  const company = await prisma.company.create({ data: { name: `Stripe Connect Browser Review ${runId}`, displayName: "Review Hauling", stripeConnectedAccountId: `acct_review_${runId}`, stripeConnectStatus: "CONNECTED", stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeDetailsSubmitted: true, stripeConnectUpdatedAt: new Date(), settings: { create: {} } } });
  const hash = await bcrypt.hash(password, 10);
  const users: Record<string,string> = {};
  for (const [role, legacy] of [["Owner","OWNER"],["Admin","OFFICE"],["Manager","MANAGER"],["Crew","CREW_MEMBER"]] as const) {
    const email = `connect-${role.toLowerCase()}-${runId}@test.invalid`;
    const user = await prisma.user.create({ data: { companyId: company.id, email, passwordHash: hash, role: legacy, active: true } });
    await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role } }); users[role] = email;
  }
  await prisma.companySubscription.create({ data: { companyId: company.id, plan: "Starter", billingInterval: "Monthly", status: "Active", lastSuccessfulPaymentAt: new Date() } });
  const profile = await prisma.pricingProfile.create({ data: { companyId: company.id, name: "Standard", defaultProfile: true } });
  const customer = await prisma.customer.create({ data: { companyId: company.id, firstName: "Portal", lastName: "Customer", phone: "555-0100" } });
  const property = await prisma.property.create({ data: { customerId: customer.id, address: "1 Review Way", city: "Albany", state: "NY", zip: "12207" } });
  const estimate = await prisma.estimate.create({ data: { companyId: company.id, pricingProfileId: profile.id, customerId: customer.id, propertyId: property.id, status: "Approved", pricingSubtotal: 125, pricingTotal: 125 } });
  const job = await prisma.job.create({ data: { companyId: company.id, estimateId: estimate.id, customerId: customer.id, propertyId: property.id } });
  const invoice = await prisma.invoice.create({ data: { companyId: company.id, customerId: customer.id, propertyId: property.id, estimateId: estimate.id, jobId: job.id, invoiceNumber: 99001, displayNumber: "INV-CONNECT-REVIEW", subtotal: 125, total: 125, balanceDue: 125, status: "Viewed", dueDate: new Date(Date.now()+86400000) } });
  await prisma.invoiceLineItem.create({ data: { invoiceId: invoice.id, description: "Junk removal", quantity: 1, unitPrice: 125, amount: 125, sortOrder: 0 } });
  const access = await prisma.customerPortalAccess.create({ data: { companyId: company.id, customerId: customer.id, email: `portal-${runId}@test.invalid` } });
  await prisma.customerPortalSession.create({ data: { portalAccessId: access.id, tokenHash: hashPortalToken(portalToken), expiresAt: new Date(Date.now()+86400000) } });
  return { company, invoice, users };
}

async function signIn(page: Page, email: string) { await page.goto(`${baseUrl}/sign-in`); await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').fill(password); await page.getByRole("button", { name: /sign in/i }).click(); await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 }).catch(() => undefined); if (!/\/(dashboard|onboarding)/.test(page.url())) throw new Error(`Sign-in failed for ${email}: ${await page.locator('[role="alert"]').allTextContents()}`); }
async function layout(page: Page, label: string) { const result = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); if (result.scroll > result.width) throw new Error(`${label} has horizontal overflow`); const small = await page.locator('button:visible,a:visible,input:visible').evaluateAll(es => es.map(e => { const r=e.getBoundingClientRect(); return { text:e.textContent?.trim().slice(0,25),w:r.width,h:r.height }; }).filter(x => x.text !== 'Open Next.js Dev Tools' && (x.w < 44 || x.h < 44))); if (small.length) throw new Error(`${label} undersized controls: ${JSON.stringify(small)}`); await page.keyboard.press("Tab"); const focus = await page.evaluate(() => { const active=document.activeElement as HTMLElement|null, style=active?getComputedStyle(active):null; return Boolean(active&&active!==document.body&&style&&(style.outlineStyle!=="none"||style.boxShadow!=="none")); }); if (!focus) throw new Error(`${label} has no visible keyboard focus`); }

async function main() {
  const fixture = await seed(); const browser = await chromium.launch({ executablePath: browserPath }); const results: string[] = [];
  try {
    for (const role of ["Owner","Admin","Manager","Crew"] as const) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); await signIn(page, fixture.users[role]); const response = await page.goto(`${baseUrl}/settings/payments`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(750);
      if (["Owner","Admin"].includes(role)) { if (!response?.ok() || !(await page.getByRole("heading", { name: "Accept Customer Payments" }).isVisible())) throw new Error(`${role} settings failed`); }
      else if (response?.status() !== 403 || !(await page.getByText(/do not have permission/i).isVisible())) throw new Error(`${role} did not receive branded 403: status=${response?.status()} body=${(await page.locator('body').innerText()).slice(0,300)}`);
      results.push(`${role}:${response?.status()}`); await context.close();
    }
    const staff = await browser.newContext(); const staffPage = await staff.newPage(); await signIn(staffPage, fixture.users.Owner);
    for (const [status, update, expected] of [
      ["disconnected", { stripeConnectedAccountId: null, stripeConnectStatus: "NOT_CONNECTED" as const }, "Connect Stripe"],
      ["onboarding", { stripeConnectedAccountId: `acct_review_${runId}`, stripeConnectStatus: "ONBOARDING" as const, stripeChargesEnabled: false, stripePayoutsEnabled: false }, "Finish setup"],
      ["action-required", { stripeConnectStatus: "ACTION_REQUIRED" as const, stripeConnectRequirementsDue: ["business_profile.url"] }, "Outstanding requirements"],
      ["connected", { stripeConnectStatus: "CONNECTED" as const, stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeConnectRequirementsDue: [] }, "Stripe connected"],
    ] as const) { await prisma.company.update({ where: { id: fixture.company.id }, data: update }); await staffPage.goto(`${baseUrl}/settings/payments`, { waitUntil: "domcontentloaded" }); await staffPage.getByText(expected, { exact: false }).first().waitFor(); results.push(status); }
    for (const [w,h] of [[390,844],[1366,768],[1920,1080]] as const) { await staffPage.setViewportSize({ width:w,height:h }); await staffPage.goto(`${baseUrl}/settings/payments`, { waitUntil: "domcontentloaded" }); await layout(staffPage, `settings ${w}x${h}`); results.push(`settings:${w}x${h}`); }
    await staff.close();
    const portal = await browser.newContext(); await portal.addCookies([{ name: PORTAL_COOKIE, value: portalToken, url: baseUrl, httpOnly: true, sameSite: "Lax" }]); const page = await portal.newPage();
    for (const [w,h] of [[390,844],[1366,768],[1920,1080]] as const) { await page.setViewportSize({ width:w,height:h }); await page.goto(`${baseUrl}/portal/invoices/${fixture.invoice.id}`, { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: "Pay Securely" }).waitFor(); await layout(page, `portal ${w}x${h}`); results.push(`portal:${w}x${h}`); }
    await page.goto(`${baseUrl}/portal/invoices/${fixture.invoice.id}?payment=confirming`); await page.getByText("Payment received — confirming").waitFor();
    await prisma.companySubscription.update({ where: { companyId: fixture.company.id }, data: { status: "Canceled", lastSuccessfulPaymentAt: null } }); await page.reload(); if (await page.getByRole("button", { name: "Pay Securely" }).count()) throw new Error("Free plan exposed Pay Securely"); results.push("free:unavailable");
    await prisma.invoice.update({ where: { id: fixture.invoice.id }, data: { status: "Paid", balanceDue: 0 } }); await page.reload(); await page.getByText("Paid", { exact: true }).waitFor(); results.push("paid:controlled"); await portal.close();
    console.log(JSON.stringify({ passed: true, results }, null, 2));
  } finally { await browser.close(); await prisma.company.delete({ where: { id: fixture.company.id } }).catch(() => undefined); await prisma.$disconnect(); }
}
void main();
