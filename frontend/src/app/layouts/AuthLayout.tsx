import { Outlet, Link } from "react-router-dom";
import { Shield } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Brand / Visual */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 text-zinc-50 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px"
        }} />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-white text-black flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <span>DataAnalyst AI</span>
          </Link>
        </div>
        <div className="relative z-10 max-w-md">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed text-zinc-200">
              “Secure, tenant-isolated analytics with natural language queries, PII redaction, and full audit trails.”
            </p>
            <footer className="text-sm text-zinc-500">Built for enterprise data teams</footer>
          </blockquote>
        </div>
        <div className="relative z-10 text-xs text-zinc-500">
          Multi-tenant • RBAC • Row-Level Security • CSRF • Rate-limited
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-2 mb-8 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <span>DataAnalyst AI</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
