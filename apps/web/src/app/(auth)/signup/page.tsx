import { SignupForm } from "@/components/auth/signupForm";
import { Loader } from "@matcha/ui/components/loader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<Loader />}>
      <SignupForm />
    </Suspense>
  );
}
