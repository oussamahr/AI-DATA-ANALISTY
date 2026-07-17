import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api-error";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Signed in successfully");
      navigate(from, { replace: true });
    } catch (err) {
      const { userMessage } = formatApiError(err);
      toast.error(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="space-y-3 text-left p-0 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium tracking-tight text-muted-foreground">Secure Login</span>
        </div>
        <CardTitle className="text-[28px] font-semibold tracking-tight leading-none">Welcome back</CardTitle>
        <CardDescription className="text-[14px]">Sign in to your tenant workspace. Sessions expire after 30 minutes idle.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 p-0">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                Forgot?
              </Link>
            </div>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-0 mt-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account? <Link to="/register" className="font-medium text-primary hover:underline">Create workspace</Link>
          </p>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Protected by httpOnly cookies, CSRF double-submit, rate limiting (5/min), and audit logging.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
