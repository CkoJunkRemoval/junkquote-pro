import {
  House,
  PlusCircle,
  Users,
  FileText,
  Truck,
  Calendar,
  BarChart3,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Home", icon: House },
  { name: "New Job", icon: PlusCircle },
  { name: "Customers", icon: Users },
  { name: "Quotes", icon: FileText },
  { name: "Jobs", icon: Truck },
  { name: "Calendar", icon: Calendar },
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col min-h-screen">

      <div className="border-b border-slate-800 p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          JunkQuote
          <span className="text-blue-400"> Pro</span>
        </h1>

        <p className="text-slate-400 text-sm mt-2">
          Less typing. More hauling.
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">

        <p className="text-xs uppercase tracking-widest text-slate-500 px-3 mb-4">
          Navigation
        </p>

        <div className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-slate-800 transition-all"
              >
                <Icon size={20} />

                <span className="font-medium">
                  {item.name}
                </span>
              </button>
            );
          })}

        </div>

      </nav>

      <div className="border-t border-slate-800 p-5">

        <div className="rounded-xl bg-slate-800 p-4">

          <p className="text-sm font-semibold">
            Version
          </p>

          <p className="text-slate-400 text-sm">
            v0.2.0 Alpha
          </p>

        </div>

      </div>

    </aside>
  );
}