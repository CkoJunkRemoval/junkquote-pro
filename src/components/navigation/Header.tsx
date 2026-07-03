import { company } from "@/lib/company";
import {
  Bell,
  Moon,
  Search,
  UserCircle2,
} from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
      <div className="relative w-full max-w-lg">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />

        <input
          type="text"
          placeholder="Search customers, quotes, jobs..."
          className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-5 ml-8">
        <button className="text-slate-500 hover:text-slate-900 transition">
          <Bell size={22} />
        </button>

        <button className="text-slate-500 hover:text-slate-900 transition">
          <Moon size={22} />
        </button>

        <button className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100 transition">
          <UserCircle2 size={30} />

          <div className="text-left">
            <p className="font-semibold">
              {company.ownerName}
            </p>

            <p className="text-xs text-slate-500">
              Owner • {company.name}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}