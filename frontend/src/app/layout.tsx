import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataMind - AI-Powered Data Analytics",
  description:
    "Transform your data into actionable insights with AI-powered analytics, visualizations, and natural language queries.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#03010A] text-slate-200 antialiased">{children}</body>
    </html>
  );
}
