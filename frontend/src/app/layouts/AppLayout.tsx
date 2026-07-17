import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, PanelLeft, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/shared/ModeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { navigation, filterNavByRole } from "@/config/navigation";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.is_superuser || false;
  const userRole = undefined; // roles are object; we rely on isAdmin check
  const filteredNav = filterNavByRole(navigation, userRole, isAdmin);

  const mainNav = filteredNav.filter((n) => n.section === "main");
  const adminNav = filteredNav.filter((n) => n.section === "admin");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <div className="space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {adminNav.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Administration</div>
          <div className="space-y-1">
            {adminNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClick}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r bg-card">
        <div className="flex h-[64px] items-center gap-2.5 px-6 border-b">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">DataAnalyst AI</span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <NavLinks />
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Header */}
        <header className="flex h-[64px] items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex h-[64px] items-center gap-2.5 px-6 border-b">
                  <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="text-[15px] font-semibold tracking-tight">DataAnalyst AI</span>
                </div>
                <div className="p-4 overflow-auto">
                  <NavLinks onClick={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="font-medium tracking-tight capitalize">
                {location.pathname === "/" ? "Dashboard" : location.pathname.split("/").filter(Boolean).join(" / ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative hidden lg:flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 h-9 w-[240px] bg-muted/50" />
            </div>

            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                    {isAdmin && <span className="inline-flex mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground w-fit">ADMIN</span>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={isLoading} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
