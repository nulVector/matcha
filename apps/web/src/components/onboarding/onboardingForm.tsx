"use client";

import { useMetadata } from "@/hooks/queries/useMetadata";
import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "@matcha/ui/components/loader";
import { initiateProfileSchema, initiateProfileType } from "@matcha/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  AvatarField,
  DiscoveryField,
  InterestsField,
  LocationField,
  TextAreaField,
  UsernameField,
} from "./onboardingFields";
import {
  OnboardingHeader,
  OnboardingNav,
  OnboardingProgress,
} from "./onboardingUI";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
  }),
};

export function OnboardingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { key: idempotencyKey, resetKey: resetIdempotencyKey } =
    useIdempotency();
  const { data: metadata, isLoading: isMetadataLoading } = useMetadata();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState(1);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "available" | "taken"
  >("idle");

  const form = useForm<initiateProfileType>({
    resolver: zodResolver(initiateProfileSchema),
    defaultValues: {
      username: "",
      avatarUrl: "",
      aboutMe: "",
      openingQues: "",
      location: "",
      locationLatitude: 0,
      locationLongitude: 0,
      interest: [],
      allowDiscovery: false,
    },
  });

  useEffect(() => {
    const defaultAvatar = metadata?.avatars?.[0];
    if (defaultAvatar && !form.getValues("avatarUrl")) {
      form.setValue("avatarUrl", defaultAvatar.url);
    }
  }, [metadata, form]);

  const { mutate: submitProfile, isPending } = useMutation({
    mutationFn: async (data: initiateProfileType) => {
      const response = await api.post("/users/onboarding", data, {
        headers: { "x-idempotency-key": idempotencyKey },
      });
      return response.data;
    },
    onSuccess: async () => {
      resetIdempotencyKey();
      await queryClient.refetchQueries({ queryKey: ["me"] });
      router.push("/home");
    },
  });

  const handleNextStep1 = async () => {
    const isValid = await form.trigger(["username", "avatarUrl"]);
    if (!isValid) return;
    if (usernameStatus === "available") {
      setDirection(1);
      setStep(2);
      return;
    }
    try {
      const res = await api.get(
        `/users/check-username?username=${form.getValues("username")}`,
      );
      const isAvailable = res.data.available;
      setUsernameStatus(isAvailable ? "available" : "taken");
      if (isAvailable) {
        setDirection(1);
        setStep(2);
      }
    } catch {
      setUsernameStatus("taken");
    }
  };

  const handleNextStep2 = async () => {
    const isValid = await form.trigger(["location", "interest"]);
    if (isValid) {
      setDirection(1);
      setStep(3);
    }
  };

  if (isMetadataLoading) {
    return (
      <div className="flex w-full h-full items-center justify-center p-12">
        <Loader />
      </div>
    );
  }

  const safeAvatars = metadata?.avatars || [];
  const safeLocations = metadata?.locations || [];

  function onSubmit(data: initiateProfileType) {
    submitProfile(data);
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-full">
      <OnboardingProgress step={step} />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto overscroll-contain no-scrollbar transform-gpu px-2 -mx-2"
        >
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4"
              >
                <OnboardingHeader
                  title="Set up your profile"
                  description="Just the essentials to get you started."
                />
                <AvatarField avatars={safeAvatars} />
                <UsernameField
                  status={usernameStatus}
                  setStatus={setUsernameStatus}
                />
                <OnboardingNav onNext={handleNextStep1} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4"
              >
                <OnboardingHeader
                  title={`Hi ${form.getValues("username") || "there"},`}
                  description="Let's personalize your matches."
                />
                <LocationField locations={safeLocations} />
                <InterestsField interests={metadata?.interests || []} />
                <OnboardingNav
                  onNext={handleNextStep2}
                  onBack={() => {
                    setDirection(-1);
                    setStep(1);
                  }}
                  backText="Back to Step 1"
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4"
              >
                <OnboardingHeader
                  title="Almost there!"
                  description="Add a little personality to your profile."
                />
                <TextAreaField
                  name="aboutMe"
                  label="About me"
                  placeholder="I spend too much time making coffee..."
                />
                <TextAreaField
                  name="openingQues"
                  label="Opening Question"
                  placeholder="What's your favorite controversial food opinion?"
                />
                <DiscoveryField />
                <OnboardingNav
                  isSubmit
                  isPending={isPending}
                  onBack={() => {
                    setDirection(-1);
                    setStep(2);
                  }}
                  backText="Back to Step 2"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </FormProvider>
    </div>
  );
}
