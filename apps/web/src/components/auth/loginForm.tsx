"use client";

import { api } from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { loginSchema, loginType } from "@matcha/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { EmailField, PasswordField } from "./AuthFields";
import {
  AuthError,
  AuthFooterLink,
  AuthHeader,
  AuthSuccess,
  OAuthSection,
} from "./AuthUI";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResetSuccess = searchParams.get("reset_success") === "true";
  const googleError = searchParams.get("error");

  const form = useForm<loginType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (data: loginType) => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    onSuccess: () => {
      router.push("/home");
    },
  });

  function onSubmit(data: loginType) {
    login(data);
  }

  const errorMessage =
    googleError === "GoogleAuthFailed"
      ? "Authentication failed. Please try again."
      : (error as any)?.response?.data?.message;

  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Welcome back"
        description="Enter your credentials to access your account"
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {isResetSuccess && !error && !googleError && (
              <AuthSuccess message="Password reset successfully. Please log in." />
            )}
            <AuthError message={errorMessage} />
            <EmailField disabled={isPending} />
            <PasswordField disabled={isPending} showForgotPassword={true} />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending && <Loader inline className="mr-2 size-4" />}
              Log in
            </Button>

            <OAuthSection />
          </div>
          <AuthFooterLink
            text="Don't have an account?"
            linkText="Sign up"
            href="/signup"
          />
        </form>
      </FormProvider>
    </div>
  );
}