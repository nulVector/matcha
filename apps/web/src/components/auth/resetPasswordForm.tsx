"use client";

import { api } from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { resetPasswordSchema, resetPasswordType } from "@matcha/zod";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { PasswordField } from "./AuthFields";
import { AuthError, AuthHeader } from "./AuthUI";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const form = useForm<resetPasswordType>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    mutate: confirmReset,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (data: resetPasswordType) => {
      const response = await api.post("/auth/confirm-password-reset", data);
      return response.data;
    },
    onSuccess: () => {
      router.replace("/login?reset_success=true");
    },
  });

  function onSubmit(data: resetPasswordType) {
    confirmReset(data);
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Invalid Link
          </h2>
          <p className="text-sm text-muted-foreground text-balance">
            This password reset link is invalid or missing the required token.
            It may have expired.
          </p>
        </div>
        <Button className="w-full mt-4" size="lg" asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const errorMessage =
    (error as AxiosError<{ message: string }>)?.response?.data?.message ||
    (error ? "Failed to reset password. The link might be expired." : null);

  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Create your new password"
        description="You're almost back in. Set a new password to continue."
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <AuthError message={errorMessage} />
            <input type="hidden" {...form.register("token")} />

            <PasswordField
              name="password"
              label="New Password"
              description="Must be at least 8 characters, containing numbers, upper and lowercase letters."
              showStrengthMeter={true}
              disabled={isPending}
            />
            <PasswordField
              name="confirmPassword"
              label="Confirm New Password"
              disabled={isPending}
            />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending && <Loader inline className="mr-1 size-4" />}
              Reset Password
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
