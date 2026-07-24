"use client";

import { Bell, Menu, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { getCompanyBranding } from "@/app/actions/company/branding";
import { clearPwaSessionState } from "@/components/pwa/PwaManager";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import DashboardQuickActions from "./DashboardQuickActions";
import GlobalSearch from "./GlobalSearch";
import { clearGlobalSearchHistory } from "./globalSearchHistory";

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
    <header className={`app-header sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 ${dashboard ? "min-h-20 flex-wrap md:flex-nowrap" : "h-20"}`}>
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="min-h-11 min-w-11 rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 lg:hidden"
      >
        <Menu size={22} />
      </button>
      {dashboard ? (
        <DashboardQuickActions canCreateEstimate={dashboard.canCreateEstimate} />
      ) : <GlobalSearch />}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          aria-label="Notifications"
          className="min-h-11 min-w-11 rounded-lg p-2 text-slate-300 hover:bg-white/10"
        >
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          {company ? <CompanyLogo src={company.logoUrl} companyName={company.displayName} size={32} fallbackClassName="rounded" /> : <UserCircle2 size={30} />}
          <span className="hidden sm:block">
            <strong className="block">
              {company?.displayName ?? "Your company"}
            </strong>
            <span className="text-xs text-slate-400">Business workspace</span>
          </span>
        </div>
        <button
          onClick={() =>
            void clearPwaSessionState().finally(() => {
              clearGlobalSearchHistory(localStorage);
              void signOut({ callbackUrl: "/sign-in" });
            })
          }
          className="min-h-11 px-2 text-sm text-slate-300 hover:text-white hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
