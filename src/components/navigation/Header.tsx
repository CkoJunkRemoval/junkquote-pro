"use client";

import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { getCompanyBranding } from "@/app/actions/company/branding";
import { clearPwaSessionState } from "@/components/pwa/PwaManager";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import DashboardQuickActions from "./DashboardQuickActions";

export default function Header({
  onMenu,
  dashboard,
}: {
  onMenu: () => void;
  dashboard?: { canCreateEstimate: boolean };
}) {
  const [company, setCompany] = useState<{
    displayName: string;
    logoUrl: string | null;
  } | null>(null);
  useEffect(() => {
    void getCompanyBranding()
      .then((value) =>
        setCompany({
          displayName: value.displayName || value.name,
          logoUrl: value.logoUrl,
        }),
      )
      .catch(() => undefined);
  }, []);
  return (
    <header className={`flex items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 ${dashboard ? "min-h-20 flex-wrap md:flex-nowrap" : "h-20"}`}>
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="min-h-11 min-w-11 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
      >
        <Menu size={22} />
      </button>
      {dashboard ? (
        <DashboardQuickActions canCreateEstimate={dashboard.canCreateEstimate} />
      ) : <div className="relative hidden max-w-lg flex-1 md:block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          placeholder="Search customers, estimates, jobs..."
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4"
        />
      </div>}
      <div className="ml-auto flex items-center gap-4">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          {company ? <CompanyLogo src={company.logoUrl} companyName={company.displayName} size={32} fallbackClassName="rounded" /> : <UserCircle2 size={30} />}
          <span className="hidden sm:block">
            <strong className="block">
              {company?.displayName ?? "Your company"}
            </strong>
            <span className="text-xs text-slate-500">Business workspace</span>
          </span>
        </div>
        <button
          onClick={() =>
            void clearPwaSessionState().finally(() =>
              signOut({ callbackUrl: "/sign-in" }),
            )
          }
          className="text-sm text-slate-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
