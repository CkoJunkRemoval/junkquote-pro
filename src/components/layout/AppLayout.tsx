"use client";

import { ReactNode, useState, useSyncExternalStore } from "react";
import Sidebar from "../navigation/Sidebar";
import Header from "../navigation/Header";
import BrandedPageShell from "../branding/BrandedPageShell";

type Props = {
  children: ReactNode;
  dashboard?: { canCreateEstimate: boolean };
};

export default function AppLayout({
  children,
  dashboard,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("junkquote:sidebar", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("junkquote:sidebar", onStoreChange);
      };
    },
    () => window.localStorage.getItem("junkquote:sidebar-collapsed") === "true",
    () => false
  );

  function toggleSidebar() {
    const next = !collapsed;
    window.localStorage.setItem("junkquote:sidebar-collapsed", String(next));
    window.dispatchEvent(new Event("junkquote:sidebar"));
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onToggle={toggleSidebar} />

      <div className="relative flex min-w-0 flex-1 flex-col">

        <Header onMenu={() => setMobileOpen(true)} dashboard={dashboard} />

        <main className="relative flex-1 overflow-auto">
          <BrandedPageShell>{children}</BrandedPageShell>
        </main>

      </div>

    </div>
  );
}
