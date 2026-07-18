import { jsPDF } from "jspdf";
type Analytics = Awaited<
  ReturnType<typeof import("./service").getAnalyticsData>
>;
export type AnalyticsReport =
  | "executive"
  | "revenue"
  | "crew"
  | "customer"
  | "recurring"
  | "smart-pricing";
export function analyticsRows(
  data: Analytics,
  report: AnalyticsReport,
  showProfit: boolean,
) {
  const rows: Array<[string, string | number]> = [
    [
      "Period",
      `${data.meta.from.toISOString().slice(0, 10)} to ${data.meta.to.toISOString().slice(0, 10)}`,
    ],
  ];
  const add = (label: string, value: string | number) =>
    rows.push([label, value]);
  if (report === "executive" || report === "revenue") {
    add("Gross revenue", data.revenue.grossRevenue);
    add("Collected revenue", data.revenue.collectedRevenue);
    add("Outstanding invoices", data.revenue.outstandingInvoices);
    add("Refund total", data.revenue.refundTotal);
    add("Revenue growth %", data.revenue.growth);
  }
  if (report === "executive") {
    add("Estimates created", data.sales.created);
    add("Approval rate %", data.sales.approvalRate);
    add("Jobs completed", data.operations.completed);
    add("New customers", data.customers.newCustomers);
    add("Active service plans", data.customers.activePlans);
  }
  if (report === "crew")
    for (const c of data.crews) {
      add(`${c.name} jobs`, c.jobs);
      add(`${c.name} revenue`, c.revenue);
      add(`${c.name} capacity %`, c.capacityUsage);
    }
  if (report === "customer") {
    add("New customers", data.customers.newCustomers);
    add("Returning customers", data.customers.returningCustomers);
    add("Repeat-job rate %", data.customers.repeatJobRate);
    add("Lifetime value", data.customers.lifetimeValue);
  }
  if (report === "recurring") {
    add("Active plans", data.customers.activePlans);
    add("Recurring jobs", data.operations.recurringJobs);
  }
  if (report === "smart-pricing") {
    add("Acceptance rate %", data.smartPricing.acceptanceRate);
    add("Estimate accuracy %", data.smartPricing.estimateAccuracy);
    if (showProfit) add("Gross margin %", data.smartPricing.grossMargin);
    add("Underbid rate %", data.smartPricing.underbidRate);
    add("Overbid rate %", data.smartPricing.overbidRate);
  }
  return rows;
}
const escapeCsv = (v: string | number) =>
  `"${String(v).replaceAll('"', '""')}"`;
export function renderAnalyticsCsv(rows: Array<[string, string | number]>) {
  return rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
}
const xmlEscape = (v: string | number) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function renderAnalyticsExcel(rows: Array<[string, string | number]>) {
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Analytics"><Table>${rows.map((r) => `<Row>${r.map((v) => `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${xmlEscape(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}
export function renderAnalyticsPdf(
  rows: Array<[string, string | number]>,
  title: string,
) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text(title, 18, 20);
  pdf.setFontSize(10);
  let y = 32;
  for (const [label, value] of rows) {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(label.slice(0, 70), 18, y);
    pdf.text(String(value).slice(0, 45), 120, y);
    y += 7;
  }
  return Buffer.from(pdf.output("arraybuffer"));
}
