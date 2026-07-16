import { ResetPasswordForm } from "@/components/auth/resetPasswordForm";
import { Loader } from "@matcha/ui/components/loader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ResetPasswordForm />
    </Suspense>
  );
}