"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@matcha/ui/components/field";
import { Input } from "@matcha/ui/components/input";
import { PasswordInput } from "@matcha/ui/components/passwordInput";
import { cn } from "@matcha/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
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
  showStrengthMeter?: boolean;
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

const calculateStrength = (password: string): number => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

export function PasswordField({
  disabled,
  name = "password",
  label = "Password",
  showForgotPassword = false,
  showStrengthMeter = false,
  description,
}: PasswordFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const score = showStrengthMeter
          ? calculateStrength(field.value || "")
          : 0;
        const activeColor =
          score >= 4
            ? "var(--color-emerald-500, #10b981)"
            : score >= 3
              ? "var(--color-yellow-500, #eab308)"
              : score >= 2
                ? "var(--color-orange-500, #f97316)"
                : "var(--color-destructive, #ef4444)";

        return (
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

            <AnimatePresence>
              {showStrengthMeter && field.value && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((index) => {
                      const isActive = score >= index;

                      return (
                        <div
                          key={index}
                          className="relative h-full flex-1 rounded-full bg-border/50 overflow-hidden"
                        >
                          <motion.div
                            initial={false}
                            animate={{
                              width: isActive ? "100%" : "0%",
                              backgroundColor: isActive
                                ? activeColor
                                : "transparent",
                            }}
                            transition={{
                              duration: 0.4,
                              ease: "easeInOut",
                              delay: isActive ? (index - 1) * 0.05 : 0,
                            }}
                            className="absolute left-0 top-0 h-full rounded-full"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <motion.p
                    key={score}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      score < 2
                        ? "text-destructive"
                        : score < 4
                          ? "text-yellow-600 dark:text-yellow-500"
                          : "text-emerald-600 dark:text-emerald-500",
                    )}
                  >
                    {strengthLabels[score]}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
