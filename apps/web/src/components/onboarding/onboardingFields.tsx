"use client";

import { AvatarPicker } from "@/components/shared/avatarPicker";
import { InterestManager } from "@/components/shared/interestManager";
import { LocationComboBox } from "@/components/shared/locationCombobox";
import { api } from "@/lib/axios";
import { VIBE_OPTIONS, VibeType } from "@matcha/shared";
import { Button } from "@matcha/ui/components/button";
import { Field, FieldError, FieldLabel } from "@matcha/ui/components/field";
import { Input } from "@matcha/ui/components/input";
import { Loader } from "@matcha/ui/components/loader";
import { SegmentedControl } from "@matcha/ui/components/segmentedControl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@matcha/ui/components/select";
import { Textarea } from "@matcha/ui/components/textarea";
import { initiateProfileType } from "@matcha/zod";
import { CheckCircle2, Search, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

export function AvatarField({ avatars }: { avatars: any[] }) {
  const { control } = useFormContext<initiateProfileType>();

  return (
    <Controller
      name="avatarUrl"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="flex flex-col items-center md:items-start">
          <FieldLabel className="text-sm hidden md:block">
            Avatar <span className="text-destructive">*</span>
          </FieldLabel>
          <AvatarPicker value={field.value} onChange={field.onChange} avatars={avatars} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

interface UsernameFieldProps {
  status: "idle" | "available" | "taken";
  setStatus: (status: "idle" | "available" | "taken") => void;
}

export function UsernameField({ status, setStatus }: UsernameFieldProps) {
  const { control, getValues, trigger } = useFormContext<initiateProfileType>();
  const [isChecking, setIsChecking] = useState(false);
  const [vibe, setVibe] = useState<string>("chaos");
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const checkUsername = async () => {
    const isValid = await trigger("username");
    if (!isValid) return;
    setIsChecking(true);
    try {
      const res = await api.get(`/users/check-username?username=${getValues("username")}`);
      setStatus(res.data.available ? "available" : "taken");
    } catch {
      setStatus("taken");
    } finally {
      setIsChecking(false);
    }
  };

  const generateUsernames = async () => {
    setIsGenerating(true);
    try {
      const res = await api.get(`/users/generate-username?vibe=${vibe}`);
      setGeneratedNames(res.data.usernames);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Controller
      name="username"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name} className="text-sm">
            Username <span className="text-destructive">*</span>
          </FieldLabel>
          <div className="relative flex items-center">
            <Input
              {...field}
              id={field.name}
              className="pr-10 h-10 text-base"
              onChange={(e) => {
                field.onChange(e);
                setStatus("idle");
              }}
            />
            <button
              type="button"
              onClick={checkUsername}
              className="absolute right-2 p-1 text-muted-foreground hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm cursor-pointer"
              aria-label="Check username availability"
            >
              {isChecking ? (
                <Loader inline className="size-4 text-muted-foreground" />
              ) : status === "available" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : status === "taken" ? (
                <XCircle className="size-4 text-destructive" />
              ) : (
                <Search className="size-4" />
              )}
            </button>
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          {status === "taken" && (
            <p className="text-sm font-medium text-destructive mt-1 animate-in fade-in">
              Username is already taken.
            </p>
          )}

          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3 mt-2 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0">
                <div className="text-sm font-semibold text-foreground">Vibe Generator</div>
                <div className="text-xs text-muted-foreground">Stuck? Let the algorithm choose.</div>
              </div>
              <div className="flex gap-2">
                <Select value={vibe} onValueChange={setVibe}>
                  <SelectTrigger className="w-27.5 bg-background h-8 text-xs">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIBE_OPTIONS.map((v: VibeType) => (
                      <SelectItem key={v} value={v} className="capitalize text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" className="h-8 text-xs shrink-0" onClick={generateUsernames} disabled={isGenerating}>
                  {isGenerating ? <Loader inline className="mr-1 size-3" /> : <Sparkles className="mr-1 h-3 w-3" />}
                  Generate
                </Button>
              </div>
            </div>
            {generatedNames.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in">
                {generatedNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      field.onChange(name);
                      setStatus("available");
                    }}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
      )}
    />
  );
}

export function LocationField({ locations }: { locations: any[] }) {
  const { control, setValue, trigger } = useFormContext<initiateProfileType>();

  return (
    <Controller
      name="location"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="flex flex-col">
          <FieldLabel className="text-sm">
            Location <span className="text-destructive">*</span>
          </FieldLabel>
          <LocationComboBox
            value={field.value}
            locations={locations}
            onChange={(name, lat, lng) => {
              field.onChange(name);
              setValue("locationLatitude", lat);
              setValue("locationLongitude", lng);
              trigger("location");
            }}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function InterestsField({ interests }: { interests: any[] }) {
  const { control } = useFormContext<initiateProfileType>();

  return (
    <Controller
      name="interest"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="flex flex-col">
          <FieldLabel className="text-sm">
            Interests <span className="text-destructive">*</span>
          </FieldLabel>
          <InterestManager value={field.value} onChange={field.onChange} metadataInterests={interests} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

interface TextAreaFieldProps {
  name: keyof initiateProfileType;
  label: string;
  placeholder: string;
}

export function TextAreaField({ name, label, placeholder }: TextAreaFieldProps) {
  const { control } = useFormContext<initiateProfileType>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name} className="text-sm">{label}</FieldLabel>
          <Textarea
            {...field}
            id={field.name}
            className="resize-none text-base"
            minRows={2}
            placeholder={placeholder}
            value={typeof field.value === 'string' ? field.value : ''} 
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function DiscoveryField() {
  const { control } = useFormContext<initiateProfileType>();

  return (
    <Controller
      name="allowDiscovery"
      control={control}
      render={({ field }) => (
        <div className="space-y-2">
          <FieldLabel className="text-sm">Profile Discovery Status</FieldLabel>
          <SegmentedControl<boolean>
            value={field.value as boolean}
            onChange={field.onChange}
            options={[
              { label: "Private", value: false },
              { label: "Discoverable", value: true },
            ]}
          />
        </div>
      )}
    />
  );
}