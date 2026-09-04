import Link from "next/link";
import { productScreenshots } from "@/lib/marketing/productScreenshots";
import ProductScreenshot from "./ProductScreenshot";

const stages = [
  {
    eyebrow: "01 — BUILD THE QUOTE",
    heading: "Build the estimate while you walk the job",
    copy: "Add items by area and keep pricing visible as the estimate comes together. Labor, disposal, rules, taxes, and other charges stay organized in the estimate.",
    image: productScreenshots.estimate,
    caption: "Itemized estimate review with the complete charge breakdown and grand total.",
  },
  {
    eyebrow: "02 — GET APPROVAL",
    heading: "Send it. Sign it. Keep moving.",
    copy: "Send the estimate by email, copy a customer approval link, collect a signature on the device, or download the estimate as a PDF.",
    image: productScreenshots.approval,
    caption: "Estimate delivery controls for email, approval links, signatures, and PDF downloads.",
  },
  {
    eyebrow: "03 — RUN THE JOB",
    heading: "Turn approved work into an organized schedule",
    copy: "Schedule jobs, assign crews, follow job status, and manage the day’s work from the dispatch board.",
    image: productScreenshots.dispatch,
    caption: "Dispatch board with scheduled, active, and completed jobs organized by status.",
  },
] as const;

export default function ProductWorkflowStory() {
  return (
    <section aria-labelledby="product-workflow-heading" className="border-t border-white/10 bg-[#090d0a] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a4ef29]">Real product workflow</p>
        <h2 id="product-workflow-heading" className="mt-3 max-w-4xl text-3xl font-black sm:text-5xl">See JunkQuote Pro in action</h2>
        <p className="mt-5 max-w-3xl text-lg text-slate-300">From the first walkthrough to customer approval and dispatch, keep the job moving in one system.</p>

        <div className="mt-14 space-y-16 sm:space-y-24">
          {stages.map((stage) => (
            <article key={stage.eyebrow}>
              <div className="mb-7 max-w-3xl">
                <p className="text-sm font-black tracking-[.16em] text-[#a4ef29]">{stage.eyebrow}</p>
                <h3 className="mt-3 text-3xl font-black sm:text-4xl">{stage.heading}</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-300">{stage.copy}</p>
              </div>
              <ProductScreenshot image={stage.image} caption={stage.caption} />
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/sign-up" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 py-3 text-center font-black text-black">Start Your 30-Day Professional Trial</Link>
          <p className="mt-4 text-sm text-slate-400">No credit card required. Full Professional access for 30 days.</p>
        </div>
      </div>
    </section>
  );
}
