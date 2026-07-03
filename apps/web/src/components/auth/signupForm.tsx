"use client";

import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@matcha/ui/components/button";
import { Loader } from "@matcha/ui/components/loader";
import { signupSchema, signupType } from "@matcha/zod";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { EmailField, PasswordField } from "./AuthFields";
import { AuthError, AuthFooterLink, AuthHeader, OAuthSection } from "./AuthUI";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { key: idempotencyKey, resetKey: resetIdempotencyKey } =
    useIdempotency();
  const googleError = searchParams.get("error");

  const form = useForm<signupType>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    mutate: signup,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (data: signupType) => {
      const response = await api.post("/auth/signup", data, {
        headers: {
          "x-idempotency-key": idempotencyKey,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      resetIdempotencyKey();
      router.push("/onboarding");
    },
  });

  function onSubmit(data: signupType) {
    signup(data);
  }

  const errorMessage =
    googleError === "GoogleAuthFailed"
      ? "Authentication failed. Please try again."
      : (error as AxiosError<{ message: string }>)?.response?.data?.message;

  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Get started on Matcha"
        description="Join to find others with shared interests."
      />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <AuthError message={errorMessage} />
            <EmailField disabled={isPending} />
            <PasswordField disabled={isPending} showStrengthMeter={true} />
            <PasswordField
              name="confirmPassword"
              label="Confirm Password"
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
              Sign Up
            </Button>

            <OAuthSection />
          </div>
          <AuthFooterLink
            text="Already have an account?"
            linkText="Log in"
            href="/login"
          />
        </form>
      </FormProvider>
    </div>
  );
}
