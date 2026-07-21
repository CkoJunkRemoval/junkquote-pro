"use client";

import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { getCompanyBranding } from "@/app/actions/company/branding";

export default function Header({ onMenu }: { onMenu: () => void }) {
  const [company, setCompany] = useState<{ displayName: string; logoUrl: string | null } | null>(null);
  useEffect(() => { void getCompanyBranding().then((value) => setCompany({ displayName: value.displayName || value.name, logoUrl: value.logoUrl })).catch(() => undefined); }, []);
  return <header className="flex h-20 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
    <button onClick={onMenu} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={22} /></button>
    <div className="relative hidden max-w-lg flex-1 md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input placeholder="Search customers, estimates, jobs..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4" /></div>
    <div className="ml-auto flex items-center gap-4"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={20} /></button><div className="flex items-center gap-2 text-sm">{company?.logoUrl ? <Image src={company.logoUrl} alt="Company logo" width={32} height={32} className="h-8 w-8 rounded object-contain" /> : <UserCircle2 size={30} />}<span className="hidden sm:block"><strong className="block">{company?.displayName ?? "Your company"}</strong><span className="text-xs text-slate-500">Business workspace</span></span></div><button onClick={() => void signOut({ callbackUrl: "/sign-in" })} className="text-sm text-slate-600 hover:underline">Sign out</button></div>
  </header>;
}
