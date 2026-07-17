import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForgotPassword } from "../hooks";
import { formatApiError } from "@/lib/api-error";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { mutateAsync, isPending } = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({ email });
      toast.success("If that email exists, a reset link has been sent");
    } catch (err) {
      const { userMessage } = formatApiError(err);
      toast.error(userMessage);
    }
  };

  return (
    <div>
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>Enter your email to receive a reset link. No account enumeration.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
        </CardContent>
        <CardFooter className="p-0 mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
          </Button>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary text-center w-full">Back to login</Link>
        </CardFooter>
      </form>
    </div>
  );
}
