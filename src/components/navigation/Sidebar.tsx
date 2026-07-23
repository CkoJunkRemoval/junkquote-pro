"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCompanyBranding } from "@/app/actions/company/branding";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { BarChart3, BriefcaseBusiness, CalendarDays, ChevronLeft, FileText, LayoutDashboard, MapPinned, RadioTower, Repeat, Settings, Tags, Users, X } from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Operations", href: "/operations", icon: RadioTower },
  { label: "Estimates", href: "/estimates", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Accounts Receivable", href: "/accounts-receivable", icon: BarChart3 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Properties", href: "/properties", icon: MapPinned },
  { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Crew App", href: "/field", icon: MapPinned },
  { label: "Service Plans", href: "/service-plans", icon: Repeat },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Dispatch", href: "/dispatch", icon: RadioTower },
  { label: "Pricing", href: "/pricing", icon: Tags },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Pricing Intelligence", href: "/analytics/pricing", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/settings/billing", icon: FileText },
];

export default function Sidebar({ collapsed, mobileOpen, onClose, onToggle }: { collapsed: boolean; mobileOpen: boolean; onClose: () => void; onToggle: () => void }) {
  const pathname = usePathname();
  const [company, setCompany] = useState<{ displayName: string; logoUrl: string | null } | null>(null);
  useEffect(() => { void getCompanyBranding().then((value) => setCompany({ displayName: value.displayName || value.name, logoUrl: value.logoUrl })).catch(() => undefined); }, []);
  const width = collapsed ? "lg:w-20" : "lg:w-64";

  return <>
    {mobileOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col bg-slate-950 text-white transition-transform lg:static lg:translate-x-0 ${width} ${mobileOpen ? "translate-x-0" : ""}`}>
      <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
        <Link href="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <CompanyLogo src={company?.logoUrl} companyName={company?.displayName} size={36} fallbackClassName="rounded-lg" />
          {!collapsed && <span className="min-w-0"><span className="block truncate text-lg font-bold">{company?.displayName ?? "Your company"}</span><span className="block truncate text-xs text-slate-400">Business workspace</span></span>}
        </Link>
        <button onClick={onClose} className="lg:hidden"><X size={20} /></button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href === "/estimates" && pathname === "/estimate");
          return <Link key={href} href={href} onClick={onClose} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon size={20} /><span className={collapsed ? "hidden" : ""}>{label}</span></Link>;
        })}
      </nav>
      <div className="hidden border-t border-slate-800 p-3 lg:block"><button onClick={onToggle} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-slate-300 hover:bg-slate-800"><ChevronLeft className={collapsed ? "rotate-180" : ""} size={20} /><span className={collapsed ? "hidden" : ""}>Collapse</span></button></div>
    </aside>
  </>;
}
