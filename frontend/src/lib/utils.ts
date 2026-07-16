import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export const colorMap = {
  teal: { bg: "bg-teal-glow", text: "text-teal", border: "border-teal/20" },
  blue: { bg: "bg-teal-glow", text: "text-teal", border: "border-teal/20" },
  violet: { bg: "bg-violet-glow", text: "text-violet", border: "border-violet/20" },
  amber: { bg: "bg-amber-glow", text: "text-amber", border: "border-amber/20" },
  green: { bg: "bg-surface-success", text: "text-green-400", border: "border-surface-success-border" },
} as const;
