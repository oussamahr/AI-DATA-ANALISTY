import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Ambient blobs */}
      <div className="ambient-blob blob-teal" />
      <div className="ambient-blob blob-violet" />
      <div className="grid-overlay" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-12">
          <span className="brand-mark" />
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
            Meridian
          </span>
          <span className="font-mono text-[11px] text-ink-faint tracking-wider">
            AI DATA ANALYST
          </span>
        </Link>

        {/* Login card */}
        <div className="glass-strong rounded-[var(--radius-lg)] p-9 w-full max-w-[380px] animate-fade-blur-in">
          <h1 className="font-display text-[22px] font-semibold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-dim mb-7">Sign in to access your analytics workspace.</p>

          {error && (
            <div className="mb-5 p-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/30">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-ink-dim">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-11 rounded-full bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-ink-dim">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 rounded-full bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-full bg-teal hover:bg-teal/90 text-void font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_26px_rgba(45,212,191,0.5)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-dim space-y-2">
            <p>
              <Link to="/forgot-password" className="text-teal hover:text-teal/80 transition-colors">
                Forgot password?
              </Link>
            </p>
            <p>
              No account?{" "}
              <Link to="/register" className="text-teal hover:text-teal/80 transition-colors font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
