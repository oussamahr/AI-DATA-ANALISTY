"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type FerrofluidBackgroundProps = {
  variant?: "default" | "login" | "register" | "reset";
  className?: string;
};

const palettes = {
  default: ["#ffffff", "#8b5cf6", "#06b6d4", "#1e1b4b"],
  login: ["#ffffff", "#06b6d4", "#8b5cf6"],
  register: ["#ffffff", "#6d28d9", "#0891b2"],
  reset: ["#ffffff", "#7c3aed", "#0e7490"],
};

/**
 * CSS-only animated gradient background.
 * Replaces the heavy WebGL Ferrofluid shader to avoid GPU overload
 * that causes browser/system freezes on integrated graphics.
 */
export default function FerrofluidBackground({
  variant = "default",
  className,
}: FerrofluidBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const palette = palettes[variant];

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#03010A]",
        className
      )}
    >
      {/* Animated gradient orbs — lightweight CSS-only alternative */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-1000",
          mounted && "opacity-90"
        )}
      >
        {/* Orb 1 */}
        <div
          className="ferrofluid-orb absolute rounded-full blur-3xl"
          style={{
            width: "60vmax",
            height: "60vmax",
            top: "-10%",
            left: "20%",
            background: `radial-gradient(circle, ${palette[1] ?? palette[0]}40, transparent 70%)`,
            animation: "ferrofluid-drift-1 18s ease-in-out infinite",
          }}
        />
        {/* Orb 2 */}
        <div
          className="ferrofluid-orb absolute rounded-full blur-3xl"
          style={{
            width: "50vmax",
            height: "50vmax",
            bottom: "-15%",
            right: "10%",
            background: `radial-gradient(circle, ${palette[2] ?? palette[1] ?? palette[0]}35, transparent 70%)`,
            animation: "ferrofluid-drift-2 22s ease-in-out infinite",
          }}
        />
        {/* Orb 3 — subtle accent */}
        <div
          className="ferrofluid-orb absolute rounded-full blur-3xl"
          style={{
            width: "40vmax",
            height: "40vmax",
            top: "30%",
            right: "30%",
            background: `radial-gradient(circle, ${palette[0]}15, transparent 70%)`,
            animation: "ferrofluid-drift-3 15s ease-in-out infinite",
          }}
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_80%_40%,rgba(6,182,212,0.1),transparent_28%),linear-gradient(180deg,rgba(3,1,10,0.35)_0%,rgba(3,1,10,0.62)_55%,rgba(3,1,10,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#03010A]/40 to-transparent" />
    </div>
  );
}
