export type ComparisonRow = {
  label: string;
  junkQuotePro: string;
  competitor: string;
};

export type ComparisonPageData = {
  slug: "housecall-pro" | "jobber" | "junkiq";
  competitor: string;
  title: string;
  description: string;
  subheading: string;
  summary: string;
  rows: ComparisonRow[];
  competitorPricing: string;
  competitorPricingUrl: string;
  comparisonAnswer: string;
  overview: { pricing: string; users: string; trial: string };
  sources: { label: string; url: string }[];
};

const commonJunkQuotePro = {
  focus: "Purpose-built for junk removal businesses",
  estimating: "Area- and item-based estimating with saved pricing",
  approval: "Customer approval links and signature capture",
  dispatch: "Scheduling and dispatch included on Professional",
  billing: "Invoicing and online payments included on Professional",
  pricing: "$89/month total for Professional, with up to 10 users",
} as const;

export const comparisonPages: Record<ComparisonPageData["slug"], ComparisonPageData> = {
  "housecall-pro": {
    slug: "housecall-pro",
    competitor: "Housecall Pro",
    title: "JunkQuote Pro vs Housecall Pro | Junk Removal Software Comparison",
    description: "Compare JunkQuote Pro and Housecall Pro for junk removal estimating, dispatch, customer workflows, invoicing, payments, and team pricing.",
    subheading: "A practical comparison for junk removal owners choosing between purpose-built software and a broader field-service platform.",
    summary: "JunkQuote Pro is organized around junk removal estimating and operations. Housecall Pro describes itself as a field-service operating platform with tools for scheduling, dispatching, estimates, customer management, invoicing, and payments.",
    rows: [
      { label: "Industry focus", junkQuotePro: commonJunkQuotePro.focus, competitor: "Field-service businesses" },
      { label: "Estimating", junkQuotePro: commonJunkQuotePro.estimating, competitor: "Estimates and price book available" },
      { label: "Customer approval", junkQuotePro: commonJunkQuotePro.approval, competitor: "Estimate approval available through Customer Portal" },
      { label: "Scheduling and dispatch", junkQuotePro: commonJunkQuotePro.dispatch, competitor: "Available" },
      { label: "Invoicing and payments", junkQuotePro: commonJunkQuotePro.billing, competitor: "Available" },
      { label: "Pricing model", junkQuotePro: commonJunkQuotePro.pricing, competitor: "Plan and user allowance dependent" },
    ],
    competitorPricing: "Housecall Pro publishes multiple plans with different included-user allowances. Check its official pricing page for the current plan and team-size total.",
    competitorPricingUrl: "https://www.housecallpro.com/pricing/",
    overview: { pricing: "View current pricing", users: "Plan and user allowance dependent", trial: "View current terms" },
    comparisonAnswer: "JunkQuote Pro is purpose-built for junk removal estimating and operations. Housecall Pro offers a broader field-service platform. Compare the workflow fit, current plan details, and total price for your team.",
    sources: [
      { label: "Housecall Pro pricing and plan details", url: "https://www.housecallpro.com/pricing/" },
      { label: "Housecall Pro field-service features", url: "https://www.housecallpro.com/features/" },
    ],
  },
  jobber: {
    slug: "jobber",
    competitor: "Jobber",
    title: "JunkQuote Pro vs Jobber | Junk Removal Software Comparison",
    description: "Compare JunkQuote Pro and Jobber for junk removal quoting, scheduling, customer management, invoicing, payments, and team pricing.",
    subheading: "A practical comparison for junk removal owners evaluating a purpose-built workflow against a multi-industry service platform.",
    summary: "JunkQuote Pro is built around junk removal workflows. Jobber serves home and commercial service businesses and publishes quoting, scheduling, client management, invoicing, payment, and time-tracking capabilities across its plans.",
    rows: [
      { label: "Industry focus", junkQuotePro: commonJunkQuotePro.focus, competitor: "Home and commercial service businesses" },
      { label: "Estimating", junkQuotePro: commonJunkQuotePro.estimating, competitor: "Professional quotes available" },
      { label: "Customer approval and signature", junkQuotePro: commonJunkQuotePro.approval, competitor: "Not verified on the reviewed pricing source" },
      { label: "Scheduling", junkQuotePro: commonJunkQuotePro.dispatch, competitor: "Available" },
      { label: "Customer management", junkQuotePro: "Customer records tied to estimates, jobs, and invoices", competitor: "Client manager available" },
      { label: "Invoicing and payments", junkQuotePro: commonJunkQuotePro.billing, competitor: "Available" },
      { label: "Pricing model", junkQuotePro: commonJunkQuotePro.pricing, competitor: "Plan and team-size dependent" },
    ],
    competitorPricing: "Jobber publishes several plans and asks for team size when recommending a plan. Check its official pricing page for the current total for your team.",
    competitorPricingUrl: "https://www.getjobber.com/pricing/",
    overview: { pricing: "View current pricing", users: "Plan and team-size dependent", trial: "View current terms" },
    comparisonAnswer: "JunkQuote Pro focuses specifically on junk removal workflows. Jobber supports many home and commercial service industries. Compare how each estimating flow matches the way your crew quotes junk and verify the current plan total for your team.",
    sources: [{ label: "Jobber pricing and feature comparison", url: "https://www.getjobber.com/pricing/" }],
  },
  junkiq: {
    slug: "junkiq",
    competitor: "JunkIQ",
    title: "JunkQuote Pro vs JunkIQ | Junk Removal Software Comparison",
    description: "Compare JunkQuote Pro and JunkIQ for junk removal quoting, scheduling, dispatch, invoicing, crews, fleet workflows, pricing, and trials.",
    subheading: "A practical comparison for junk removal owners choosing between two industry-focused products.",
    summary: "Both products are presented as software for junk removal companies. JunkQuote Pro emphasizes area- and item-based estimates, approval and signature workflows, operations, timekeeping, and fleet tools. JunkIQ publishes voice and item-list quoting, scheduling, dispatch, invoicing, crew payouts, lead tracking, and fleet tools.",
    rows: [
      { label: "Industry focus", junkQuotePro: commonJunkQuotePro.focus, competitor: "Built for junk removal companies" },
      { label: "Estimating", junkQuotePro: commonJunkQuotePro.estimating, competitor: "Voice, cubic-yard, and item-list quote tools" },
      { label: "Customer approval and signature", junkQuotePro: commonJunkQuotePro.approval, competitor: "Not verified on the reviewed product page" },
      { label: "Scheduling and dispatch", junkQuotePro: commonJunkQuotePro.dispatch, competitor: "Available" },
      { label: "Invoicing", junkQuotePro: commonJunkQuotePro.billing, competitor: "Invoicing and ledger tools available" },
      { label: "Crew and fleet operations", junkQuotePro: "Timekeeping, crews, and fleet tools on Professional", competitor: "Crew payouts plus fleet, capacity, and maintenance tools" },
      { label: "Pricing model", junkQuotePro: commonJunkQuotePro.pricing, competitor: "$79/month with unlimited users" },
      { label: "Trial", junkQuotePro: "30-day Professional trial; no card required", competitor: "7-day free trial" },
    ],
    competitorPricing: "JunkIQ currently publishes one $79/month price with unlimited users and a 7-day free trial. Verify its official page before choosing because competitor terms can change.",
    competitorPricingUrl: "https://junkiq.app/",
    overview: { pricing: "$79/month", users: "Unlimited users", trial: "7-day free trial" },
    comparisonAnswer: "Both are built for junk removal companies. The useful comparison is how each product handles estimating, approvals, dispatch, crew operations, fleet work, and the current total price for your company.",
    sources: [{ label: "JunkIQ product, pricing, and trial details", url: "https://junkiq.app/" }],
  },
};

export function comparisonFaqs(data: ComparisonPageData) {
  return [
    ["Is JunkQuote Pro built specifically for junk removal companies?", "Yes. JunkQuote Pro is designed around junk removal estimating, customer approval, job creation, dispatch, invoicing, crews, and fleet operations."],
    ["How does JunkQuote Pro pricing work?", "Professional is $89 per month for the company and includes up to 10 users. The current plan catalog also includes Free, Starter, and Enterprise options."],
    ["Does JunkQuote Pro charge per user?", "No. Each plan has a user limit, but the company pays the listed plan price rather than a separate fee for every user."],
    ["Can I try JunkQuote Pro before choosing a paid plan?", "Yes. New companies receive a 30-day Professional trial with no credit card required. If they do not subscribe, they move to the Free plan after the trial."],
    [`How does JunkQuote Pro compare with ${data.competitor}?`, data.comparisonAnswer],
  ] as const;
}
