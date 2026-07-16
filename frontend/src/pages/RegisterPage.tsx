import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ferrofluid } from "@/components/effects/Ferrofluid";
import { SpecularButton } from "@/components/effects/SpecularButton";
import { Loader2 } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      navigate("/login");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr.response?.data?.detail || "Registration failed");
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
        <Link to="/" className="flex items-center gap-2.5 mb-10" aria-label="Meridian home">
          <span className="brand-mark" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Meridian
          </span>
          <span className="font-mono text-[10px] text-ink-faint tracking-wider ml-0.5">
            AI DATA ANALYST
          </span>
        </Link>

        <div className="glass-strong rounded-[var(--radius-xl)] p-8 w-full max-w-[380px] animate-fade-blur-in">
          <div className="mb-6">
            <h1 className="font-display text-[22px] font-semibold text-ink tracking-tight">
              Create account
            </h1>
            <p className="text-[13px] text-ink-dim mt-1.5">
              Start analyzing your data in minutes.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-[var(--radius-sm)] bg-surface-error border border-surface-error-border" role="alert">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Create account form">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[13px] font-medium text-ink-dim">
                  First name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[13px] font-medium text-ink-dim">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>
            </div>
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
                minLength={8}
                className="h-10 rounded-[var(--radius-sm)] bg-glass-bg border-glass-border text-ink placeholder:text-ink-faint focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-ink-dim">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </SpecularButton>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-dim">
            Already have an account?{" "}
            <Link to="/login" className="text-teal hover:text-teal-hover transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
