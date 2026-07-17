"use client";

import React from "react";
import Navbar from "@/components/layout/Navbar";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#03010A]">
        <Navbar />
        <main className="pt-16">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
