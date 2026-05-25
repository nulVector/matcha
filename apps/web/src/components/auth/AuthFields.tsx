import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@matcha/ui/components/field";
import { Input } from "@matcha/ui/components/input";
import { PasswordInput } from "@matcha/ui/components/passwordInput";
import Link from "next/link";
import { Controller, useFormContext } from "react-hook-form";

interface EmailFieldProps {
  disabled?: boolean;
}

interface PasswordFieldProps {
  disabled?: boolean;
  name?: string;
  label?: string;
  showForgotPassword?: boolean;
  description?: string;
}

export function EmailField({ disabled }: EmailFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
          <Input
            {...field}
            id={field.name}
            type="email"
            placeholder="m@example.com"
            aria-invalid={fieldState.invalid}
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function PasswordField({
  disabled,
  name = "password",
  label = "Password",
  showForgotPassword = false,
  description,
}: PasswordFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {showForgotPassword && (
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            )}
          </div>
          <PasswordInput
            {...field}
            id={field.name}
            placeholder="••••••••"
            aria-invalid={fieldState.invalid}
            disabled={disabled}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
