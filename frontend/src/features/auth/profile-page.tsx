import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { formatDate, getErrorMessage, getInitials } from "@/utils/cn";
import { useState } from "react";

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      setError(null);
      setSuccess(false);
      const updated = await api.updateMe(data.first_name, data.last_name);
      setUser(updated);
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your personal information</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="size-20">
            <AvatarFallback className="text-2xl">
              {getInitials(user?.first_name, user?.last_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-sm text-muted">{user?.email}</p>
            <div className="mt-2 flex gap-2">
              {user?.is_verified && <Badge variant="success">Verified</Badge>}
              {user?.is_superuser && <Badge variant="accent">Admin</Badge>}
            </div>
            {user?.last_login_at && (
              <p className="mt-2 text-xs text-muted">Last login: {formatDate(user.last_login_at)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your name and personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                Profile updated successfully
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" {...register("first_name")} />
                {errors.first_name && <p className="text-xs text-danger">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" {...register("last_name")} />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
