import { CheckCircle2, Truck } from "lucide-react";
import type { ReactNode } from "react";

const benefits = ["Win more jobs", "Run operations smarter", "Get paid faster"];

export default function BrandedAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__light" aria-hidden="true" />
      <section className="auth-marketing" aria-label="About JunkQuote Pro">
        <div className="brand-lockup">
          <span className="brand-lockup__mark">
            <Truck aria-hidden="true" size={24} />
          </span>
          <span>
            JUNK<span>QUOTE</span>
            <small>PRO</small>
          </span>
        </div>
        <div className="auth-marketing__copy">
          <p className="auth-marketing__eyebrow">Built for the field</p>
          <h1>
            Built for <span>Junk Removal</span> Pros
          </h1>
          <p>
            The all-in-one platform to run, grow, and scale your junk removal
            business.
          </p>
          <ul>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <CheckCircle2 aria-hidden="true" size={17} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="auth-form-region">{children}</section>
    </main>
  );
}
