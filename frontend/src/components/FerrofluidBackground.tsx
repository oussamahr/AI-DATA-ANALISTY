"use client";

import Ferrofluid from "@/components/Ferrofluid";
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

const directions = {
  default: "down",
  login: "down",
  register: "up",
  reset: "left",
} as const;

export default function FerrofluidBackground({
  variant = "default",
  className,
}: FerrofluidBackgroundProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#03010A]", className)}>
      <div className="absolute inset-0 opacity-90">
        <Ferrofluid
          colors={palettes[variant]}
          speed={0.55}
          scale={0.7}
          turbulence={1.35}
          fluidity={0.18}
          rimWidth={0.3}
          sharpness={2.35}
          shimmer={1.25}
          glow={2.45}
          flowDirection={directions[variant]}
          opacity={1}
          mouseInteraction={false}
          mouseStrength={0}
          mouseRadius={0.35}
          dpr={1}
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_80%_40%,rgba(6,182,212,0.1),transparent_28%),linear-gradient(180deg,rgba(3,1,10,0.35)_0%,rgba(3,1,10,0.62)_55%,rgba(3,1,10,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#03010A]/40 to-transparent" />
    </div>
  );
}
