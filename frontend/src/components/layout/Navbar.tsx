"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import {
  BarChart3,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/visualizations", label: "Visualizations", icon: FileText },
  { href: "/transforms", label: "Transforms", icon: Zap },
  { href: "/llm", label: "AI Assistant", icon: Sparkles },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight hidden sm:block">
              DataMind
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-lg shadow-violet-500/10"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user?.is_superuser && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/admin"
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-white/50 hover:text-amber-400 hover:bg-amber-500/5"
                )}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden lg:inline">Admin</span>
              </Link>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70 text-sm hidden sm:block">
                {user ? `${user.first_name} ${user.last_name}`.trim() || "User" : "User"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-xl border-t border-white/5">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
