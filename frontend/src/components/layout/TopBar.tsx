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
import { Menu, LogOut, X } from "lucide-react";
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
    <header className="sticky top-0 z-50 h-14 px-5 sm:px-8 flex items-center justify-between bg-void/80 border-b border-glass-border backdrop-blur-xl saturate-150">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0">
        <span className="brand-mark" />
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
          Meridian
        </span>
        <span className="font-mono text-[10px] text-ink-faint tracking-wider ml-0.5 hidden sm:inline">
          AI DATA ANALYST
        </span>
      </Link>

      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-[var(--radius-sm)] hover:bg-glass-bg-strong text-ink-dim transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop nav */}
      <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "text-ink bg-glass-bg-strong"
                  : "text-ink-dim hover:text-ink hover:bg-glass-bg"
              }`}
              aria-current={active ? "page" : undefined}
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
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-teal to-violet text-void text-[11px] font-mono font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-strong text-ink min-w-[200px] rounded-[var(--radius-md)]"
            >
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-ink">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-[12px] text-ink-faint mt-0.5">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-glass-border my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-ink-dim focus:text-red-400 focus:bg-surface-error px-3 py-2 cursor-pointer"
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
        <div className="lg:hidden absolute top-full left-0 right-0 glass-strong border-b border-glass-border p-3 z-50 animate-slide-up">
          <nav className="flex flex-col gap-1" role="navigation" aria-label="Mobile navigation">
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
