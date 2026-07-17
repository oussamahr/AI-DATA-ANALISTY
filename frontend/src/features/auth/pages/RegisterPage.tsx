import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatApiError, validatePasswordPolicy } from "@/lib/api-error";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const policyErr = validatePasswordPolicy(password);
    if (policyErr) {
      toast.error(policyErr);
      return;
    }
    setIsLoading(true);
    try {
      await register(email, password, firstName, lastName);
      toast.success("Account created. Please verify your email.");
      navigate("/login");
    } catch (err) {
      const { userMessage } = formatApiError(err);
      toast.error(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium tracking-tight text-muted-foreground">Create account</span>
        </div>
        <CardHeader className="p-0 space-y-2">
          <CardTitle className="text-[28px] font-semibold tracking-tight leading-none">Create workspace</CardTitle>
          <CardDescription>Password: 8+ chars, upper, lower, digit, special. Tenant-isolated from start.</CardDescription>
        </CardHeader>
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="jane@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Strong password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <p className="text-[11px] text-muted-foreground">Min 8 chars, upper/lower/digit/special required (backend enforced)</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-0 mt-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </div>
  );
}
