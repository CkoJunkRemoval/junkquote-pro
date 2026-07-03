import { ReactNode } from "react";
import Sidebar from "../navigation/Sidebar";
import Header from "../navigation/Header";

type Props = {
  children: ReactNode;
};

export default function AppLayout({
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <div className="flex flex-col flex-1">

        <Header />

        <main className="flex-1 overflow-auto">
          {children}
        </main>

      </div>

    </div>
  );
}