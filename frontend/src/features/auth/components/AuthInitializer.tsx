import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../store";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function AuthInitializer({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner text="Initializing secure session..." />
      </div>
    );
  }

  return <>{children}</>;
}
