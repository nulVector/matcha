import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/resetPasswordForm";
import { Loader } from "@matcha/ui/components/loader";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ResetPasswordForm />
    </Suspense>
  );
}