"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCompanyBranding } from "@/app/actions/company/branding";
import { getVisibleNavigationModules } from "@/app/actions/auth/navigation";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import type { CompanyModule } from "@/lib/auth/companyCapabilities";
import { BarChart3, BriefcaseBusiness, CalendarDays, ChevronLeft, CircleDollarSign, FileText, Landmark, LayoutDashboard, MapPinned, MessageSquare, RadioTower, Repeat, Settings, Tags, Truck, Users, X } from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Operations", href: "/operations", icon: RadioTower, module: "operations" },
  { label: "Fleet & Assets", href: "/fleet", icon: Truck, module: "fleet" },
  { label: "Estimates", href: "/estimates", icon: FileText, module: "estimates" },
  { label: "Invoices", href: "/invoices", icon: FileText, module: "invoices" },
  { label: "Accounts Receivable", href: "/accounts-receivable", icon: BarChart3, module: "accountsReceivable" },
  { label: "Finance", href: "/finance", icon: CircleDollarSign, module: "finance" },
  { label: "Tax Center", href: "/tax", icon: Landmark, module: "tax" },
  { label: "Customers", href: "/customers", icon: Users, module: "customers" },
  { label: "Team", href: "/team", icon: Users, module: "workforce" },
  { label: "My Time", href: "/team/time", icon: CalendarDays, module: "myTime" },
  { label: "Team Timesheets", href: "/team/timesheets", icon: FileText, module: "teamTime" },
  { label: "Pay Periods", href: "/team/pay-periods", icon: CalendarDays, module: "teamTime" },
  { label: "Time Exceptions", href: "/team/time-exceptions", icon: RadioTower, module: "teamTime" },
  { label: "Properties", href: "/properties", icon: MapPinned, module: "properties" },
  { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness, module: "jobs" },
  { label: "Crew App", href: "/field", icon: MapPinned, module: "field" },
  { label: "Service Plans", href: "/service-plans", icon: Repeat, module: "servicePlans" },
  { label: "Schedule", href: "/schedule", icon: CalendarDays, module: "schedule" },
  { label: "Dispatch", href: "/dispatch", icon: RadioTower, module: "dispatch" },
  { label: "Communications", href: "/communications", icon: MessageSquare, module: "communications" },
  { label: "Pricing", href: "/pricing", icon: Tags, module: "pricing" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, module: "analytics" },
  { label: "Pricing Intelligence", href: "/analytics/pricing", icon: BarChart3, module: "pricingIntelligence" },
  { label: "Company Hub", href: "/settings/company", icon: Settings, module: "companyHub" },
  { label: "Billing", href: "/settings/billing", icon: FileText, module: "billing" },
] satisfies Array<{ label: string; href: string; icon: typeof LayoutDashboard; module: CompanyModule }>;

export default function Sidebar({ collapsed, mobileOpen, onClose, onToggle }: { collapsed: boolean; mobileOpen: boolean; onClose: () => void; onToggle: () => void }) {
  const pathname = usePathname();
  const [company, setCompany] = useState<{ displayName: string; logoUrl: string | null } | null>(null);
  const [visibleModules, setVisibleModules] = useState<CompanyModule[]>([]);
  useEffect(() => { void getCompanyBranding().then((value) => setCompany({ displayName: value.displayName || value.name, logoUrl: value.logoUrl })).catch(() => undefined); }, []);
  useEffect(() => { void getVisibleNavigationModules().then(setVisibleModules).catch(() => setVisibleModules([])); }, []);
  const width = collapsed ? "lg:w-20" : "lg:w-[17rem]";
  const visibleItems = items.filter((item) => visibleModules.includes(item.module));

  return <>
    {mobileOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-sm lg:hidden" />}
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col text-white transition-[width,transform] lg:static lg:translate-x-0 ${width} ${mobileOpen ? "translate-x-0" : ""}`}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <Link href="/dashboard" onClick={onClose} className="flex min-h-11 min-w-0 items-center gap-3">
          <CompanyLogo src={company?.logoUrl} companyName={company?.displayName} size={36} fallbackClassName="rounded-lg !bg-[var(--brand-orange)]" />
          <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}><span className="block truncate text-base font-bold">{company?.displayName ?? "Your company"}</span><span className="block truncate text-[11px] uppercase tracking-[0.16em] text-slate-400">JunkQuote Pro</span></span>
        </Link>
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="min-h-11 min-w-11 lg:hidden"
        >
          <X className="mx-auto" size={20} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map(({ label, href, icon: Icon }) => {
          const moreSpecificItemMatches = visibleItems.some((item) => item.href.startsWith(`${href}/`) && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
          const active = pathname === href || (pathname.startsWith(`${href}/`) && !moreSpecificItemMatches) || (href === "/estimates" && pathname === "/estimate");
          return <Link key={href} href={href} onClick={onClose} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={`sidebar-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "sidebar-link--active" : "text-slate-300"}`}><Icon className="shrink-0" size={19} /><span className={`min-w-0 whitespace-normal leading-5 ${collapsed ? "lg:sr-only" : ""}`}>{label}</span></Link>;
        })}
      </nav>
      <div className="hidden border-t border-white/10 p-3 lg:block"><button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={onToggle} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 hover:bg-white/5"><ChevronLeft className={`shrink-0 ${collapsed ? "rotate-180" : ""}`} size={20} /><span className={collapsed ? "hidden" : ""}>Collapse</span></button></div>
    </aside>
  </>;
}
