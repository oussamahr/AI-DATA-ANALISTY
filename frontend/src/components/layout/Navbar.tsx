import { Link, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search";
import { MobileMenuButton } from "@/components/layout/mobile-drawer";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { getInitials } from "@/utils/cn";

interface NavbarProps {
  title?: string;
}

export function Navbar({ title }: NavbarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* proceed with local logout */
    }
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <MobileMenuButton />

      {title && (
        <h1 className="hidden text-lg font-semibold text-foreground sm:block lg:hidden">{title}</h1>
      )}

      <div className="hidden flex-1 md:block md:max-w-md">
        <SearchInput placeholder="Search datasets, analyses..." aria-label="Search" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              aria-label="User menu"
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  {getInitials(user?.first_name, user?.last_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:block">
                {user?.first_name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="hidden size-4 text-muted sm:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] rounded-xl border border-border bg-surface p-1 shadow-card animate-in fade-in-0 zoom-in-95"
              sideOffset={8}
              align="end"
            >
              <DropdownMenu.Item asChild>
                <Link
                  to="/profile"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted-surface focus:bg-muted-surface"
                >
                  <User className="size-4" />
                  Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  to="/settings"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted-surface focus:bg-muted-surface"
                >
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger outline-none hover:bg-danger/5 focus:bg-danger/5"
                onSelect={handleLogout}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
