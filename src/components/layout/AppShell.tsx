import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, CookingPot, ShoppingBasket, Refrigerator, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/recipes", label: "Recepti", icon: CookingPot },
  { to: "/shopping", label: "Kupovina", icon: ShoppingBasket },
  { to: "/inventory", label: "Frižider", icon: Refrigerator },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Smart Meal Planner</div>
            <h1 className="text-xl font-semibold tracking-tight">Tvoj plan. Tvoja lista. Gotovo.</h1>
          </div>
          <NavLink
            to="/account"
            className={({ isActive }) =>
              cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm",
                isActive && "ring-2 ring-neutral-200"
              )
            }
            aria-label="Nalog"
          >
            <User size={18} />
          </NavLink>
        </header>

        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-around px-4 py-2">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(
                  "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs text-neutral-500",
                  isActive && "text-neutral-900"
                )
              }
            >
              <it.icon size={18} />
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
