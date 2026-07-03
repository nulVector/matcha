import { SignupForm } from "@/components/auth/signupForm";
import { Loader } from "@matcha/ui/components/loader";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense fallback={<Loader />}>
      <SignupForm />
    </Suspense>
  );
}
