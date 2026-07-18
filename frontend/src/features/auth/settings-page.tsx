import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { getErrorMessage } from "@/utils/cn";
import { useState } from "react";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setPasswordError(null);
      setPasswordSuccess(false);
      await api.changePassword(data.current_password, data.new_password);
      setPasswordSuccess(true);
      reset();
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="size-5 text-primary" />
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted">Email</Label>
              <p className="mt-1 text-sm font-medium text-foreground">{user?.email}</p>
            </div>
            <div>
              <Label className="text-muted">Status</Label>
              <p className="mt-1 text-sm font-medium text-foreground">
                {user?.is_verified ? "Verified" : "Unverified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-primary" />
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
            {passwordError && (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                Password changed successfully
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" {...register("current_password")} />
              {errors.current_password && <p className="text-xs text-danger">{errors.current_password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" {...register("new_password")} />
              {errors.new_password && <p className="text-xs text-danger">{errors.new_password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" {...register("confirm_password")} />
              {errors.confirm_password && <p className="text-xs text-danger">{errors.confirm_password.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
