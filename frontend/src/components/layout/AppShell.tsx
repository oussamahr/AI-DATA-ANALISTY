import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen">
      <TopBar />
      <main className="relative z-1 max-w-[1180px] mx-auto px-7 py-10 grid grid-cols-[216px_1fr] gap-7">
        <LeftRail />
        <div className="flex flex-col gap-[34px]">
          {children}
        </div>
      </main>
    </div>
  );
}
