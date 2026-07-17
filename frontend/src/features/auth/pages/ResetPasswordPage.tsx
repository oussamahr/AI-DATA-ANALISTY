import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useResetPassword } from "../hooks";
import { formatApiError, validatePasswordPolicy } from "@/lib/api-error";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    try {
      await mutateAsync({ token, new_password: password });
      toast.success("Password reset successfully");
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err).userMessage);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Invalid reset link</h2>
        <p className="text-sm text-muted-foreground mt-2">Token missing from URL.</p>
        <Link to="/forgot-password" className="text-sm text-primary underline mt-4 inline-block">Request new link</Link>
      </div>
    );
  }

  return (
    <div>
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Enter new password. Must meet policy requirements.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-0 space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New strong password" />
          </div>
        </CardContent>
        <CardFooter className="p-0 mt-6">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset password
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}
