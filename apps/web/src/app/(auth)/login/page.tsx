import { LoginForm } from "@/components/auth/loginForm";
import { Loader } from "@matcha/ui/components/loader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginForm />
    </Suspense>
  );
}
