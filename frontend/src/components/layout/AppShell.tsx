import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen">
      <TopBar />
      <main className="relative z-1 max-w-[1200px] mx-auto px-5 sm:px-8 py-8 grid grid-cols-[220px_1fr] gap-8">
        <LeftRail />
        <div className="flex flex-col gap-8 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
