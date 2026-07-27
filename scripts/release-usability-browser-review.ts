import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.USABILITY_REVIEW_BASE_URL ?? "http://127.0.0.1:3105";
const browserPath =
  process.env.USABILITY_REVIEW_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const email = "release-usability@test.invalid";
const password = "ReleaseUsability!123";

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.toLowerCase().includes("test")
  )
    throw new Error("Usability review requires a local disposable test database.");
}

async function seed() {
  assertDisposableDatabase();
  const existing = await prisma.company.findMany({
    where: { name: "Release Usability Review" },
    select: { id: true },
  });
  const companyIds = existing.map((row) => row.id);
  if (companyIds.length) {
    await prisma.assetTimelineEvent.deleteMany({
      where: { companyId: { in: companyIds } },
    });
    await prisma.assetMileageEntry.deleteMany({
      where: { companyId: { in: companyIds } },
    });
    await prisma.fleetAsset.deleteMany({
      where: { companyId: { in: companyIds } },
    });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  }
  const company = await prisma.company.create({
    data: {
      name: "Release Usability Review",
      displayName: "Release Usability Review",
      onboarding: { create: { currentStep: 10, completedAt: new Date() } },
    },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
      firstName: "Release",
      lastName: "Reviewer",
    },
  });
  await prisma.companyMembership.create({
    data: { companyId: company.id, userId: user.id, role: "Owner" },
  });
  const unused = await prisma.fleetAsset.create({
    data: {
      companyId: company.id,
      type: "Equipment",
      category: "Tool",
      assetNumber: "BROWSER-UNUSED",
      name: "Browser Unused Asset",
      timelineEvents: {
        create: {
          companyId: company.id,
          eventType: "Created",
          sourceType: "FleetAsset",
          sourceId: "browser-unused-created",
          occurredAt: new Date(),
          createdById: user.id,
        },
      },
    },
  });
  const historical = await prisma.fleetAsset.create({
    data: {
      companyId: company.id,
      type: "Equipment",
      category: "Tool",
      assetNumber: "BROWSER-HISTORY",
      name: "Browser Historical Asset",
      timelineEvents: {
        create: {
          companyId: company.id,
          eventType: "Created",
          sourceType: "FleetAsset",
          sourceId: "browser-history-created",
          occurredAt: new Date(),
          createdById: user.id,
        },
      },
      mileageEntries: {
        create: {
          companyId: company.id,
          odometerMiles: 10,
          recordedAt: new Date(),
          source: "Manual",
          createdById: user.id,
        },
      },
    },
  });
  return { company, unused, historical };
}

async function login(page: Page) {
  const csrf = (await (
    await page.request.get(`${baseUrl}/api/auth/csrf`)
  ).json()) as { csrfToken: string };
  const response = await page.request.post(
    `${baseUrl}/api/auth/callback/credentials`,
    {
      form: {
        csrfToken: csrf.csrfToken,
        email,
        password,
        callbackUrl: `${baseUrl}/fleet/assets`,
      },
    },
  );
  if (!response.ok())
    throw new Error(`Authenticated review login failed: ${response.status()}`);
}

async function assertNoOverflow(page: Page, route: string) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));
  if (widths.content > widths.viewport)
    throw new Error(`${route} has horizontal overflow: ${JSON.stringify(widths)}`);
}

async function reviewPasswords(page: Page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  const signInPassword = page.locator("#sign-in-password");
  for (let attempt = 0; attempt < 50; attempt++) {
    await page.getByRole("button", { name: "Show password" }).click();
    await page.waitForTimeout(100);
    if (
      await page.getByRole("button", { name: "Hide password" }).count()
    ) {
      await page.getByRole("button", { name: "Hide password" }).click();
      break;
    }
    if (attempt === 49) throw new Error("Sign-in password control did not hydrate.");
  }
  await signInPassword.fill("preserved-value");
  if ((await signInPassword.getAttribute("type")) !== "password")
    throw new Error("Sign-in password was not hidden by default.");
  const show = page.getByRole("button", { name: "Show password" });
  await show.focus();
  if (
    (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) !==
    "Show password"
  )
    throw new Error("Password toggle did not receive keyboard focus.");
  await show.click();
  await page.waitForTimeout(250);
  const revealState = await page.evaluate(() => ({
    type: document.querySelector("#sign-in-password")?.getAttribute("type"),
    label: document
      .querySelector(".password-visibility-toggle")
      ?.getAttribute("aria-label"),
  }));
  if (revealState.type !== "text")
    throw new Error(`Sign-in toggle did not reveal: ${JSON.stringify(revealState)}`);
  if (
    (await signInPassword.getAttribute("type")) !== "text" ||
    (await signInPassword.inputValue()) !== "preserved-value"
  )
    throw new Error(
      `Sign-in reveal did not preserve the value: ${JSON.stringify({
        type: await signInPassword.getAttribute("type"),
        value: await signInPassword.inputValue(),
      })}`,
    );
  await page.getByRole("button", { name: "Hide password" }).click();
  if ((await signInPassword.getAttribute("type")) !== "password")
    throw new Error("Sign-in password did not hide again.");

  await page.goto(`${baseUrl}/sign-up`, { waitUntil: "domcontentloaded" });
  const create = page.getByLabel("Password", { exact: true });
  const confirm = page.getByLabel("Confirm password", { exact: true });
  for (let attempt = 0; attempt < 50; attempt++) {
    await page.getByRole("button", { name: "Show password" }).first().click();
    await page.waitForTimeout(100);
    if (
      await page.getByRole("button", { name: "Hide password" }).count()
    ) {
      await page.getByRole("button", { name: "Hide password" }).click();
      break;
    }
    if (attempt === 49)
      throw new Error("Account-creation password controls did not hydrate.");
  }
  await create.fill("creation-value");
  await confirm.fill("confirmation-value");
  const toggles = page.getByRole("button", { name: "Show password" });
  await toggles.first().click();
  if (
    (await create.getAttribute("type")) !== "text" ||
    (await confirm.getAttribute("type")) !== "password"
  )
    throw new Error("Account-creation password toggles were not independent.");
  if (
    (await create.inputValue()) !== "creation-value" ||
    (await confirm.inputValue()) !== "confirmation-value"
  )
    throw new Error("Account-creation toggle changed field values.");
}

async function reviewFleet(
  page: Page,
  fixture: Awaited<ReturnType<typeof seed>>,
) {
  await login(page);
  await page.goto(`${baseUrl}/fleet/${fixture.unused.id}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText("This unused asset has no operational history.").waitFor();
  await page.getByLabel(`Type ${fixture.unused.name} to confirm`).fill(fixture.unused.name);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove Asset" }).click();
  await page.waitForURL("**/fleet/assets");
  if (await prisma.fleetAsset.findUnique({ where: { id: fixture.unused.id } }))
    throw new Error("Unused asset was not permanently deleted.");

  await page.goto(`${baseUrl}/fleet/${fixture.historical.id}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText(/Permanent deletion is unavailable/).waitFor();
  await page.getByLabel("Reason").fill("Browser retirement review");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Retire", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "marked retired" }).waitFor();
  if (
    (await prisma.fleetAsset.findUnique({
      where: { id: fixture.historical.id },
      select: { status: true },
    }))?.status !== "Retired"
  )
    throw new Error("Retirement did not persist.");

  await page.goto(`${baseUrl}/fleet/assets`, { waitUntil: "domcontentloaded" });
  if (await page.getByText(fixture.historical.name, { exact: true }).count())
    throw new Error("Inactive asset appeared in the default active directory.");
  await page.goto(`${baseUrl}/fleet/assets?status=Retired`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText(fixture.historical.name, { exact: true }).waitFor();
}

async function main() {
  const fixture = await seed();
  const browser = await chromium.launch({ executablePath: browserPath });
  const screenshots: string[] = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => console.error("Browser page error:", error));
    page.on("console", (message) => {
      if (message.type() === "error")
        console.error("Browser console error:", message.text());
    });
    for (const [width, height] of [
      [390, 844],
      [1366, 768],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      await reviewPasswords(page);
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        window.scrollTo(0, 0);
        document.querySelector(".auth-shell")?.scrollTo(0, 0);
      });
      await assertNoOverflow(page, "/sign-up");
      const authCardBox = await page.locator(".auth-card").boundingBox();
      if (
        !authCardBox ||
        authCardBox.x < 0 ||
        authCardBox.x + authCardBox.width > width
      )
        throw new Error(
          `Authentication card is clipped at ${width}x${height}: ${JSON.stringify(authCardBox)}`,
        );
      if (width === 390) {
        const box = await page
          .getByRole("button", { name: "Show password" })
          .last()
          .boundingBox();
        if (!box || box.width < 44 || box.height < 44)
          throw new Error(`Password touch target is undersized: ${JSON.stringify(box)}`);
      }
      const authScreenshot = join(
        tmpdir(),
        `junkquote-release-auth-${width}x${height}.png`,
      );
      await page.screenshot({ path: authScreenshot, fullPage: true });
      screenshots.push(authScreenshot);
      await login(page);
      await page.goto(`${baseUrl}/fleet/${fixture.historical.id}`, {
        waitUntil: "domcontentloaded",
      });
      await assertNoOverflow(page, `/fleet/${fixture.historical.id}`);
      const fleetScreenshot = join(
        tmpdir(),
        `junkquote-release-fleet-${width}x${height}.png`,
      );
      await page.screenshot({ path: fleetScreenshot, fullPage: true });
      screenshots.push(fleetScreenshot);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await reviewFleet(page, fixture);
    await assertNoOverflow(page, "/fleet/assets?status=Retired");
    console.log(
      JSON.stringify(
        {
          authenticated: true,
          passwordControls: "passed",
          fleetLifecycle: "passed",
          viewports: ["390x844", "1366x768", "1920x1080"],
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
