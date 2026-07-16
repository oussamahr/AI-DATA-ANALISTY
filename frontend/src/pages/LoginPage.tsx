import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ferrofluid } from "@/components/effects/Ferrofluid";
import { SpecularButton } from "@/components/effects/SpecularButton";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

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
      <Ferrofluid
        colors={["#2DD4BF", "#8B7FF5", "#0D1526"]}
        backgroundColor="#090E1A"
        speed={0.35}
        scale={1.4}
        turbulence={0.8}
        fluidity={0.15}
        rimWidth={0.18}
        sharpness={2.5}
        shimmer={1.2}
        glow={1.6}
        flowDirection="down"
        opacity={0.9}
        mouseInteraction={false}
        paused={prefersReducedMotion}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-10" aria-label="Meridian home">
          <span className="brand-mark" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Meridian
          </span>
          <span className="font-mono text-[10px] text-ink-faint tracking-wider ml-0.5">
            AI DATA ANALYST
          </span>
        </Link>

        {/* Login card */}
        <div className="glass-strong rounded-[var(--radius-xl)] p-8 w-full max-w-[380px] animate-fade-blur-in">
          <div className="mb-6">
            <h1 className="font-display text-[22px] font-semibold text-ink tracking-tight">
              Welcome back
            </h1>
            <p className="text-[13px] text-ink-dim mt-1.5">
              Sign in to access your analytics workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-[var(--radius-sm)] bg-surface-error border border-surface-error-border" role="alert">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Sign in form">
            <div className="space-y-1.5">
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
                className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div className="space-y-1.5">
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
                className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>

            <SpecularButton
              type="submit"
              disabled={loading}
              size="lg"
              radius={12}
              className="w-full mt-1"
              followMouse={!prefersReducedMotion}
              autoAnimate={false}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </SpecularButton>
          </form>

          <div className="mt-5 text-center text-[13px] text-ink-dim space-y-1.5">
            <p>
              <Link to="/forgot-password" className="text-teal hover:text-teal-hover transition-colors">
                Forgot password?
              </Link>
            </p>
            <p>
              No account?{" "}
              <Link to="/register" className="text-teal hover:text-teal-hover transition-colors font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
