"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { getCompanyBranding } from "@/app/actions/company/branding";

export default function DashboardHero() {
  const [companyName, setCompanyName] = useState("your business");

  useEffect(() => {
    void getCompanyBranding()
      .then((company) => setCompanyName(company.displayName || company.name))
      .catch(() => undefined);
  }, []);

  return (
    <section className="dashboard-hero" data-testid="dashboard-hero">
      <div className="dashboard-hero__content">
        <p className="dashboard-hero__eyebrow">Command center</p>
        <h1>Welcome back</h1>
        <p>Here&apos;s what&apos;s happening at {companyName}.</p>
      </div>
      <div className="dashboard-hero__date" aria-label="Today">
        <CalendarDays aria-hidden="true" size={17} />
        <time dateTime={new Date().toISOString().slice(0, 10)}>
          {new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date())}
        </time>
      </div>
    </section>
  );
}
