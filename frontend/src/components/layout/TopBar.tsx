import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Console" },
  { to: "/datasets", label: "Datasets" },
  { to: "/analytics", label: "Reports" },
  { to: "/admin", label: "Team" },
];

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "?";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 h-16 px-7 flex items-center justify-between bg-glass-bg border-b border-glass-border backdrop-blur-xl saturate-150">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <span className="brand-mark" />
        <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
          Meridian
        </span>
        <span className="font-mono text-[11px] text-ink-faint tracking-wider ml-0.5 hidden sm:inline">
          AI DATA ANALYST
        </span>
      </div>

      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-[var(--radius-sm)] hover:bg-glass-bg-strong text-ink-dim transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-7">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium transition-colors ${
                active ? "text-ink" : "text-ink-dim hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="flex items-center gap-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0 hover:bg-glass-bg-strong"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-teal to-violet text-void text-xs font-mono font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-strong text-ink min-w-[180px]"
            >
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium text-ink">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-ink-faint">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-ink-dim focus:text-red-400 focus:bg-surface-error"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 glass-strong rounded-b-[var(--radius-lg)] p-3 z-50 animate-slide-up">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rail-item"
                data-active={location.pathname === item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
