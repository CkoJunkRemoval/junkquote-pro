/** Optional authenticated Team Invitations browser review. */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.TEAM_INVITATION_REVIEW_BASE_URL ?? "http://127.0.0.1:3104";
const edgePath = process.env.TEAM_INVITATION_REVIEW_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = "team-invitation-review@test.invalid";
const password = "TeamInvitationReview!123";
const generateInvitationToken = () => randomBytes(32).toString("base64url");
const hashInvitationToken = (value: string) => createHash("sha256").update(value).digest("hex");

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.toLowerCase().includes("test"))
    throw new Error("Team invitation review requires a local disposable test database.");
}
async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({ data: { name: "Invitation Review Co", displayName: "Invitation Review Co", onboarding: { create: { completedAt: new Date() } } } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email, passwordHash: await bcrypt.hash(password, 10), role: "OWNER", firstName: "Team", lastName: "Reviewer" } });
  await prisma.companyMembership.create({ data: { companyId: company.id, userId: owner.id, role: "Owner" } });
  const states = ["valid", "expired", "revoked", "accepted"] as const;
  const tokens = {} as Record<(typeof states)[number], string>;
  for (const state of states) {
    const token = generateInvitationToken();
    tokens[state] = token;
    const employee = await prisma.employee.create({ data: { companyId: company.id, firstName: state[0].toUpperCase() + state.slice(1), lastName: "Invite", email: `${state}@test.invalid`, role: "CrewMember", invitationStatus: state === "valid" ? "Pending" : state } });
    await prisma.teamInvitation.create({ data: {
      companyId: company.id, employeeId: employee.id, email: employee.email!, role: "Crew",
      tokenHash: hashInvitationToken(token), createdByUserId: owner.id,
      status: state === "valid" ? "Pending" : state === "expired" ? "Expired" : state === "revoked" ? "Revoked" : "Accepted",
      expiresAt: state === "expired" ? new Date(Date.now() - 60_000) : new Date(Date.now() + 86_400_000),
      revokedAt: state === "revoked" ? new Date() : undefined,
      acceptedAt: state === "accepted" ? new Date() : undefined,
    } });
  }
  return tokens;
}
async function login(page: Page) {
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await page.request.post(`${baseUrl}/api/auth/callback/credentials`, { form: { csrfToken, email, password, callbackUrl: `${baseUrl}/team/invitations` } });
  if (!response.ok()) throw new Error(`Authenticated review login failed: ${response.status()}`);
}
async function noOverflow(page: Page, route: string) {
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  if (size.content > size.viewport) throw new Error(`${route} has horizontal overflow.`);
}
async function main() {
  const tokens = await seed();
  const browser = await chromium.launch({ executablePath: edgePath });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const [state, expected] of [["expired", "expired"], ["revoked", "revoked"], ["accepted", "already been accepted"]] as const) {
      const route = `/join?token=${tokens[state]}`;
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.getByText(new RegExp(expected, "i")).waitFor();
      await noOverflow(page, route);
    }
    await page.goto(`${baseUrl}/join?token=${tokens.valid}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Join Invitation Review Co" }).waitFor();
    await page.getByRole("button", { name: "Create Password & Join Company" }).waitFor();
    await noOverflow(page, "/join");
    const publicShot = join(tmpdir(), "junkquote-team-invitation-join-mobile.png");
    await page.screenshot({ path: publicShot, fullPage: true });
    await login(page);
    await page.goto(`${baseUrl}/team/invitations`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Team invitations" }).waitFor();
    await page.getByRole("heading", { name: "Invite Team Member" }).waitFor();
    await page.getByRole("button", { name: "Resend" }).waitFor();
    await page.getByRole("button", { name: "Revoke" }).waitFor();
    await noOverflow(page, "/team/invitations");
    const adminShot = join(tmpdir(), "junkquote-team-invitations-admin-mobile.png");
    await page.screenshot({ path: adminShot, fullPage: true });
    console.log(JSON.stringify({ authenticated: true, states: ["valid", "expired", "revoked", "accepted"], viewport: "390x844", screenshots: [publicShot, adminShot] }, null, 2));
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
void main();
