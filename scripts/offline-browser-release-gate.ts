/**
 * Optional local browser gate.
 *
 * Install its browser driver without changing package manifests:
 * npm install --no-save --package-lock=false playwright-core
 *
 * Check: npm run typecheck:offline-browser-gate
 * Run:   npx tsx scripts/offline-browser-release-gate.ts
 */
import { chromium, type Page } from "playwright-core";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { REQUIRED_FIELD_CHECKLIST } from "../src/lib/fieldOperations/policy";

const baseUrl = process.env.OFFLINE_GATE_BASE_URL ?? "http://127.0.0.1:3100";
const edgePath =
  process.env.OFFLINE_GATE_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = "OfflineGate!123";
const crewEmail = "offline-crew@test.invalid";
const officeEmail = "offline-office@test.invalid";

function assertDisposableDatabase() {
  const value = process.env.DATABASE_URL ?? "";
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.slice(1).includes("test")
  )
    throw new Error("Offline browser gate requires a local disposable test database.");
}

async function seedJob(input: {
  companyId: string;
  pricingProfileId: string;
  customerId: string;
  propertyId: string;
  employeeId: string;
  number: string;
}) {
  const estimate = await prisma.estimate.create({
    data: {
      companyId: input.companyId,
      pricingProfileId: input.pricingProfileId,
      customerId: input.customerId,
      propertyId: input.propertyId,
      status: "InProgress",
      displayNumber: `EST-${input.number}`,
      pricingTotal: 400,
      jobSites: {
        create: {
          name: "Main load",
          sortOrder: 0,
          items: {
            create: {
              itemId: `item-${input.number}`,
              name: "Sectional sofa",
              category: "Furniture",
              quantity: 1,
              basePrice: 100,
              sortOrder: 0,
            },
          },
        },
      },
    },
  });
  return prisma.job.create({
    data: {
      companyId: input.companyId,
      estimateId: estimate.id,
      customerId: input.customerId,
      propertyId: input.propertyId,
      jobNumber: input.number,
      status: "InProgress",
      schedulingStatus: "InProgress",
      fieldStage: "Cleanup",
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
      arrivalWindowStart: new Date(),
      arrivalWindowEnd: new Date(Date.now() + 60 * 60 * 1000),
      customerInstructions: "Use the side entrance.",
      assignments: {
        create: {
          companyId: input.companyId,
          employeeId: input.employeeId,
          role: "CrewLead",
          lead: true,
        },
      },
      fieldChecklistItems: {
        create: REQUIRED_FIELD_CHECKLIST.map(([key, label]) => ({
          companyId: input.companyId,
          key,
          label,
          required: true,
        })),
      },
    },
  });
}

async function seed() {
  assertDisposableDatabase();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({
    data: { name: "Offline Browser Gate", displayName: "Offline Browser Gate" },
  });
  const pricingProfile = await prisma.pricingProfile.create({
    data: {
      companyId: company.id,
      name: "Standard",
      defaultProfile: true,
    },
  });
  const [crewUser, officeUser] = await Promise.all([
    prisma.user.create({
      data: {
        companyId: company.id,
        email: crewEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: "CREW_MEMBER",
        firstName: "Offline",
        lastName: "Crew",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: officeEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: "OFFICE",
        firstName: "Office",
        lastName: "Manager",
      },
    }),
  ]);
  await prisma.companyMembership.createMany({
    data: [
      { companyId: company.id, userId: crewUser.id, role: "Crew" },
      { companyId: company.id, userId: officeUser.id, role: "Office" },
    ],
  });
  const [crewEmployee, customer] = await Promise.all([
    prisma.employee.create({
      data: {
        companyId: company.id,
        userId: crewUser.id,
        firstName: "Offline",
        lastName: "Crew",
        role: "CrewLead",
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: "Browser",
        lastName: "Customer",
        phone: "555-0101",
        email: "browser-customer@test.invalid",
      },
    }),
  ]);
  const property = await prisma.property.create({
    data: {
      customerId: customer.id,
      address: "10 Offline Way",
      city: "Testville",
      state: "NY",
      zip: "10001",
      gateCode: "1234",
      accessNotes: "Crew-safe access note.",
      notes: "Private office note must not be cached.",
    },
  });
  const common = {
    companyId: company.id,
    pricingProfileId: pricingProfile.id,
    customerId: customer.id,
    propertyId: property.id,
    employeeId: crewEmployee.id,
  };
  const successJob = await seedJob({ ...common, number: "JOB-OFFLINE-1" });
  const conflictJob = await seedJob({ ...common, number: "JOB-OFFLINE-2" });
  return { company, successJob, conflictJob };
}

async function login(page: Page) {
  const authResponses: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/auth/")) {
      authResponses.push(`${response.status()} ${response.url()}`);
      if (response.url().includes("/callback/"))
        void response.text().then((body) => authResponses.push(body)).catch(() => undefined);
    }
  });
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
  await page.locator("#sign-in-email").fill(crewEmail);
  await page.locator("#sign-in-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(5_000);
  if (new URL(page.url()).pathname === "/sign-in") {
    const error = await page.locator('[role="alert"]').textContent().catch(() => null);
    const button = await page.getByRole("button").textContent().catch(() => null);
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(
      `Crew sign-in failed at ${page.url()}${error ? `: ${error.trim()}` : ` (button: ${button?.trim() ?? "missing"}; auth: ${authResponses.join(", ") || "none"}; body: ${body.slice(0, 240)})`}.`,
    );
  }
}

async function downloadJob(page: Page, number: string) {
  await page.goto(`${baseUrl}/field`, { waitUntil: "domcontentloaded" });
  const card = page.locator("article").filter({ hasText: number });
  await card.getByRole("button", { name: "Make available offline" }).click();
  await page.getByText("Job saved on this device", { exact: false }).waitFor();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

async function assertMobile(page: Page) {
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    activeVisible:
      !document.activeElement ||
      document.activeElement === document.body ||
      document.activeElement.getBoundingClientRect().bottom <= innerHeight,
  }));
  if (layout.width !== 390 || layout.scrollWidth > 390 || !layout.activeVisible)
    throw new Error(`Mobile layout failed: ${JSON.stringify(layout)}`);
  const tooSmall = await page.locator("button:visible, a:visible, input:visible, select:visible, textarea:visible").evaluateAll(
    (elements) =>
      elements
        .map((element) => ({
          text: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
          height: element.getBoundingClientRect().height,
        }))
        .filter((row) => row.height > 0 && row.height < 44 && row.text !== "INPUT"),
  );
  if (tooSmall.length)
    throw new Error(`Touch targets below 44px: ${JSON.stringify(tooSmall.slice(0, 10))}`);
}

async function stageOfflineWork(page: Page, number: string, note: string) {
  await page.goto(`${baseUrl}/field`, { waitUntil: "domcontentloaded" });
  await page.getByText("Saved jobs").waitFor({ timeout: 5_000 }).catch(async () => {
    throw new Error(
      `Offline cold start did not render saved jobs at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 500)}`,
    );
  });
  const card = page.locator("article").filter({ hasText: number });
  await card.getByRole("button", { name: "Open saved job" }).click();
  await page.getByText("Offline · saved on this device").waitFor();

  const noteSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Field notes" }) });
  await noteSection.locator("textarea").fill(note);
  await noteSection.getByRole("button", { name: "Save on this device" }).click();

  const checklist = page.locator("section").filter({ has: page.getByRole("heading", { name: "Checklist" }) });
  const checkboxes = checklist.locator('input[type="checkbox"]');
  for (let index = 0; index < (await checkboxes.count()); index += 1) {
    const checkbox = checkboxes.nth(index);
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
      await page.waitForFunction(
        ({ selector, item }: { selector: string; item: number }) =>
          (document.querySelectorAll<HTMLInputElement>(selector)[item]?.checked ?? false),
        { selector: 'section input[type="checkbox"]', item: index },
      );
    }
  }

  const photoSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Stage photos" }) });
  const photoBuffer = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      context.fillStyle = "#2563eb";
      context.fillRect(0, 0, 8, 8);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  const pixel = { name: "offline.png", mimeType: "image/png", buffer: photoBuffer };
  await photoSection.locator("select").selectOption("Before");
  await photoSection.locator('input[type="file"]').setInputFiles(pixel);
  await page.getByText("Photo saved on this device", { exact: false }).waitFor({ timeout: 5_000 }).catch(async () => {
    throw new Error(`Before photo staging failed: ${(await page.locator("body").innerText()).slice(-500)}`);
  });
  await photoSection.locator("select").selectOption("After");
  await photoSection.locator('input[type="file"]').setInputFiles({ ...pixel, name: "offline-after.png" });
  await page.getByText("Photo saved on this device", { exact: false }).waitFor();

  const signatureSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Customer completion signature" }) });
  await signatureSection.locator('input[name="name"]').fill("Browser Customer");
  const canvas = signatureSection.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Signature canvas is not visible.");
  await canvas.dispatchEvent("pointerdown", {
    clientX: box.x + 20,
    clientY: box.y + 40,
    pointerId: 1,
  });
  await canvas.dispatchEvent("pointermove", {
    clientX: box.x + 160,
    clientY: box.y + 80,
    pointerId: 1,
  });
  await canvas.dispatchEvent("pointerup", {
    clientX: box.x + 160,
    clientY: box.y + 80,
    pointerId: 1,
  });
  await signatureSection.getByRole("button", { name: "Save signature on this device" }).click();

  const completion = page.locator("section").filter({ has: page.getByRole("heading", { name: "Stage completion" }) });
  await completion.locator("textarea").fill("Offline completion ready");
  await completion.getByRole("button", { name: "Complete on this device" }).click();
  await page.getByText("Completed on this device — waiting to sync.").waitFor();

  await noteSection.locator("textarea").focus();
  await page.evaluate(() => document.activeElement?.scrollIntoView({ block: "center" }));
  await assertMobile(page);
}

async function manualSync(page: Page) {
  const syncResponses: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/field/offline/"))
      void response
        .text()
        .then((body) => syncResponses.push(`${response.status()} ${response.url()} ${body}`))
        .catch(() => undefined);
  });
  await page.context().setOffline(false);
  await page.goto(`${baseUrl}/field`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sync now" }).click();
  await page
    .getByText(/Changes synced|Some changes need review|Everything is already synced|Some changes could not sync/)
    .waitFor({ timeout: 10_000 })
    .catch(async () => {
      throw new Error(`Manual sync did not finish: ${(await page.locator("body").innerText()).slice(0, 1_000)}`);
    });
  if (await page.getByText("Some changes could not sync.").isVisible().catch(() => false))
    throw new Error(`Manual sync failed: ${syncResponses.join("\n")}`);
}

async function waitFor<T>(load: () => Promise<T>, ready: (value: T) => boolean) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await load();
    if (ready(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for authoritative server state.");
}

async function verifySuccess(jobId: string, before: { invoices: number; communications: number }) {
  const job = await waitFor(
    () =>
      prisma.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          fieldChecklistItems: true,
          photos: true,
          completionSignature: true,
          invoice: true,
        },
      }),
    (value) => value.status === "Completed",
  );
  if (
    job.fieldStage !== "Completed" ||
    !job.crewNotes.includes("Browser offline note") ||
    job.fieldChecklistItems.some((item) => !item.completedAt) ||
    job.photos.length !== 2 ||
    !job.completionSignature
  )
    throw new Error("Authoritative job state did not contain every offline change.");
  const [noteMutations, photoMutations, signatureMutations, completionMutations, timeline, invoices, communications] =
    await Promise.all([
      prisma.offlineFieldMutation.count({ where: { jobId, mutationType: "JOB_FIELD_NOTE_ADD" } }),
      prisma.offlineFieldMutation.count({ where: { jobId, mutationType: "JOB_PHOTO_STAGE" } }),
      prisma.offlineFieldMutation.count({ where: { jobId, mutationType: "JOB_SIGNATURE_STAGE" } }),
      prisma.offlineFieldMutation.count({ where: { jobId, mutationType: "JOB_COMPLETION_STAGE" } }),
      prisma.estimateTimelineEvent.count({ where: { jobId, eventType: "Job Completed" } }),
      prisma.invoice.count({ where: { jobId } }),
      prisma.communicationEvent.count({ where: { sourceType: "Job", sourceId: jobId } }),
    ]);
  if (
    noteMutations !== 1 ||
    photoMutations !== 2 ||
    signatureMutations !== 1 ||
    completionMutations !== 1 ||
    timeline !== 1 ||
    job.crewNotes.match(/Browser offline note/g)?.length !== 1
  )
    throw new Error("Duplicate offline writes or lifecycle events were detected.");
  if (before.invoices !== 0 || before.communications !== 0)
    throw new Error("Invoice or communication activity occurred before synchronization.");
  if (invoices !== 0 || communications > 1)
    throw new Error("Unexpected post-sync invoice or duplicate communication activity.");
}

async function run() {
  const fixture = await seed();
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ["--disable-background-networking"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  try {
    await login(page);
    await downloadJob(page, fixture.successJob.jobNumber!);
    await page.setViewportSize({ width: 390, height: 844 });
    await assertMobile(page);
    await context.setOffline(true);
    await stageOfflineWork(page, fixture.successJob.jobNumber!, "Browser offline note");
    const before = {
      invoices: await prisma.invoice.count({ where: { jobId: fixture.successJob.id } }),
      communications: await prisma.communicationEvent.count({
        where: { sourceType: "Job", sourceId: fixture.successJob.id },
      }),
    };
    if ((await prisma.job.findUniqueOrThrow({ where: { id: fixture.successJob.id } })).status === "Completed")
      throw new Error("Job completed before server acknowledgement.");
    await manualSync(page);
    await verifySuccess(fixture.successJob.id, before);

    await downloadJob(page, fixture.conflictJob.jobNumber!);
    await context.setOffline(true);
    await stageOfflineWork(page, fixture.conflictJob.jobNumber!, "Conflict offline note");
    await prisma.job.update({
      where: { id: fixture.conflictJob.id },
      data: { status: "Cancelled", schedulingStatus: "Cancelled" },
    });
    await manualSync(page);
    await page.getByText("Some changes need review.").waitFor();
    await page.getByText("Changes needing review").waitFor();
    await page.getByText(/office cancelled this job|needs review before completion/i).first().waitFor();
    const cancelled = await prisma.job.findUniqueOrThrow({ where: { id: fixture.conflictJob.id } });
    const completion = await prisma.offlineFieldMutation.findFirstOrThrow({
      where: { jobId: fixture.conflictJob.id, mutationType: "JOB_COMPLETION_STAGE" },
    });
    if (cancelled.status !== "Cancelled" || cancelled.completedAt || completion.status !== "Conflict")
      throw new Error("Cancellation conflict did not preserve authoritative server state.");
    await assertMobile(page);
    console.log(JSON.stringify({
      browser: "Microsoft Edge",
      desktopOffline: "passed",
      mobileViewport: "390x844 passed",
      syncIdempotency: "passed",
      cancellationConflict: "passed",
      successJobId: fixture.successJob.id,
      conflictJobId: fixture.conflictJob.id,
    }));
  } finally {
    await context.close();
    await browser.close();
    await prisma.$disconnect();
  }
}

void run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
