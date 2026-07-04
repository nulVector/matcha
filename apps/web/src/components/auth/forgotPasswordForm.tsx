"use client";

import { api } from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import {
  requestPasswordResetSchema,
  requestPasswordResetType,
} from "@matcha/zod";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { EmailField } from "./AuthFields";
import { AuthError, AuthFooterLink, AuthHeader } from "./AuthUI";

export function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<requestPasswordResetType>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const {
    mutate: requestReset,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (data: requestPasswordResetType) => {
      const response = await api.post("/auth/request-password-reset", data);
      return response.data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  function onSubmit(data: requestPasswordResetType) {
    requestReset(data);
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground text-balance">
            If an account exists for{" "}
            <span className="font-medium text-foreground">
              {form.getValues("email")}
            </span>
            , we&apos;ve sent instructions to reset your password.
          </p>
        </div>
        <Button className="w-full mt-4" size="lg" asChild>
          <Link href="/login">Return to log in</Link>
        </Button>
      </div>
    );
  }

  const errorMessage =
    (error as AxiosError<{ message: string }>)?.response?.data?.message ||
    (error ? "Something went wrong. Please try again." : null);

  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Reset your password"
        description="Don't worry, it happens. We'll send a recovery link."
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <AuthError message={errorMessage} />
            <EmailField disabled={isPending} />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending && <Loader inline className="mr-1 size-4" />}
              Send Reset Link
            </Button>
          </div>

          <AuthFooterLink
            text="Remember your password?"
            linkText="Log in"
            href="/login"
          />
        </form>
      </FormProvider>
    </div>
  );
}
