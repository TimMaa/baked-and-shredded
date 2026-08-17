import { NavLink } from "react-router-dom";
import { Dumbbell, ListChecks, Play, BarChart3, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/exercises", icon: Dumbbell, label: "Exercises" },
  { to: "/workouts", icon: ListChecks, label: "Workouts" },
  { to: "/execute", icon: Play, label: "Execute" },
  { to: "/history", icon: BarChart3, label: "History" },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
