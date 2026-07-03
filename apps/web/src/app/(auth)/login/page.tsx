import { LoginForm } from "@/components/auth/loginForm";
import { Loader } from "@matcha/ui/components/loader";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginForm />
    </Suspense>
  );
}
