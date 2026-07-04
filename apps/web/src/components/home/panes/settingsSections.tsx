"use client";

import { AvatarPicker } from "@/components/shared/avatarPicker";
import { InterestManager } from "@/components/shared/interestManager";
import { LocationComboBox } from "@/components/shared/locationCombobox";
import { useIdempotency } from "@/hooks/useIdempotency";
import { api } from "@/lib/axios";
import { useOutboxStore } from "@/store/useOutboxStore";
import type { Metadata, UserSettingsProfile } from "@/types/models";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@matcha/ui/components/accordion";
import { Button } from "@matcha/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@matcha/ui/components/dialog";
import { Input } from "@matcha/ui/components/input";
import { Loader } from "@matcha/ui/components/loader";
import { PasswordInput } from "@matcha/ui/components/passwordInput";
import { SegmentedControl } from "@matcha/ui/components/segmentedControl";
import { Textarea } from "@matcha/ui/components/textarea";
import type { updateProfileType } from "@matcha/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { LogOut, Save, ShieldAlert } from "lucide-react";
import { useState } from "react";

export interface SettingsSectionProps {
  profile: UserSettingsProfile;
  metadata?: Metadata;
  updateProfile: (data: updateProfileType) => void;
  isUpdating: boolean;
}

export function UsernameSetting({ username }: { username: string }) {
  return (
    <AccordionItem value="username">
      <AccordionTrigger className="text-sm font-medium">
        Username
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-1.5 pt-1">
          <Input
            value={username || ""}
            readOnly
            className="h-9 bg-muted/40 text-muted-foreground cursor-not-allowed focus-visible:ring-0 shadow-none border-transparent"
          />
          <p className="text-[11px] text-muted-foreground pl-1">
            Your unique Matcha handle.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function AvatarSetting({
  profile,
  metadata,
  updateProfile,
  isUpdating,
}: SettingsSectionProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");

  return (
    <AccordionItem value="avatar">
      <AccordionTrigger className="text-sm font-medium">
        Avatar
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pt-2">
        <AvatarPicker
          value={avatarUrl}
          onChange={setAvatarUrl}
          avatars={metadata?.avatars || []}
        />
        <Button
          size="sm"
          className="w-full transition-all duration-200 active:scale-[0.98]"
          onClick={() => updateProfile({ avatarUrl })}
          disabled={isUpdating || avatarUrl === profile.avatarUrl}
        >
          {isUpdating ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save Avatar
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function LocationSetting({
  profile,
  metadata,
  updateProfile,
  isUpdating,
}: SettingsSectionProps) {
  const [locationData, setLocationData] = useState({
    name: profile.location || "",
    lat: profile.locationLatitude || 0,
    lng: profile.locationLongitude || 0,
  });

  return (
    <AccordionItem value="location">
      <AccordionTrigger className="text-sm font-medium">
        Location
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-1">
        <LocationComboBox
          value={locationData.name}
          locations={metadata?.locations || []}
          onChange={(name, lat, lng) => setLocationData({ name, lat, lng })}
        />
        <Button
          size="sm"
          className="w-full transition-all duration-200 active:scale-[0.98]"
          onClick={() =>
            updateProfile({
              location: locationData.name,
              locationLatitude: locationData.lat,
              locationLongitude: locationData.lng,
            })
          }
          disabled={isUpdating || locationData.name === profile.location}
        >
          {isUpdating ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save Location
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function InterestSetting({
  profile,
  metadata,
  updateProfile,
  isUpdating,
}: SettingsSectionProps) {
  const [interest, setInterest] = useState<string[]>(profile.interest || []);
  const isInterestValid = interest.length >= 3 && interest.length <= 10;

  return (
    <AccordionItem value="interest">
      <AccordionTrigger className="text-sm font-medium">
        Interests
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pt-1">
        <InterestManager
          value={interest}
          onChange={setInterest}
          metadataInterests={metadata?.interests || []}
        />
        <Button
          size="sm"
          className="w-full transition-all duration-200 active:scale-[0.98]"
          onClick={() => updateProfile({ interest })}
          disabled={isUpdating || !isInterestValid}
        >
          {isUpdating ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save Interests
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function AboutMeSetting({
  profile,
  updateProfile,
  isUpdating,
}: Omit<SettingsSectionProps, "metadata">) {
  const [aboutMe, setAboutMe] = useState(profile.aboutMe || "");

  return (
    <AccordionItem value="about">
      <AccordionTrigger className="text-sm font-medium">
        About me
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-1">
        <Textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="I spend too much time making coffee..."
          className="resize-none text-sm"
          minRows={3}
        />
        <Button
          size="sm"
          className="w-full transition-all duration-200 active:scale-[0.98]"
          onClick={() => updateProfile({ aboutMe })}
          disabled={
            isUpdating || aboutMe.trim() === "" || aboutMe === profile.aboutMe
          }
        >
          {isUpdating ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save About Me
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function OpeningQuesSetting({
  profile,
  updateProfile,
  isUpdating,
}: Omit<SettingsSectionProps, "metadata">) {
  const [openingQues, setOpeningQues] = useState(profile.openingQues || "");

  return (
    <AccordionItem value="question">
      <AccordionTrigger className="text-sm font-medium">
        Opening Question
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-1">
        <Textarea
          value={openingQues}
          onChange={(e) => setOpeningQues(e.target.value)}
          placeholder="What's your favorite controversial food opinion?"
          className="resize-none text-sm"
          minRows={3}
        />
        <Button
          size="sm"
          className="w-full transition-all duration-200 active:scale-[0.98]"
          onClick={() => updateProfile({ openingQues })}
          disabled={
            isUpdating ||
            openingQues.trim() === "" ||
            openingQues === profile.openingQues
          }
        >
          {isUpdating ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Save Question
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function DiscoverySetting({
  profile,
  updateProfile,
  isUpdating,
}: Omit<SettingsSectionProps, "metadata">) {
  return (
    <AccordionItem value="discovery">
      <AccordionTrigger className="text-sm font-medium">
        Discovery Status
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pt-2 pb-2">
        <SegmentedControl<boolean>
          value={profile?.allowDiscovery || false}
          onChange={(val) => updateProfile({ allowDiscovery: val })}
          disabled={isUpdating}
          options={[
            { label: "Private", value: false },
            { label: "Discoverable", value: true },
          ]}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

export function PasswordSetting() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const { key: passKey, resetKey: resetPassKey } = useIdempotency();

  const { mutate: updatePassword, isPending: isUpdatingPassword } = useMutation(
    {
      mutationFn: async () =>
        await api.patch(
          "/users/me/update-password",
          { currentPassword, newPassword },
          { headers: { "x-idempotency-key": passKey } },
        ),
      onSuccess: () => {
        setCurrentPassword("");
        setNewPassword("");
        setPasswordError("");
        setPasswordSuccess(true);
        setTimeout(() => setPasswordSuccess(false), 3000);
      },
      onError: (err: AxiosError<{ message: string }>) => {
        setPasswordSuccess(false);
        setPasswordError(
          err.response?.data?.message || "Failed to update password.",
        );
      },
      onSettled: () => resetPassKey(),
    },
  );

  return (
    <AccordionItem value="password">
      <AccordionTrigger className="text-sm font-medium">
        Change Password
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Current Password
          </label>
          <PasswordInput
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            placeholder="Enter current password"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            New Password
          </label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            placeholder="Enter new password"
            className="h-9"
          />
        </div>

        {passwordError && (
          <p className="text-xs text-destructive font-medium animate-in fade-in">
            {passwordError}
          </p>
        )}
        {passwordSuccess && (
          <p className="text-xs text-primary font-medium animate-in fade-in">
            Password successfully updated!
          </p>
        )}

        <Button
          size="sm"
          className="w-full mt-2 transition-all duration-200 active:scale-[0.98]"
          onClick={() => updatePassword()}
          disabled={isUpdatingPassword || !currentPassword || !newPassword}
        >
          {isUpdatingPassword ? (
            <Loader inline className="size-4 mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          Update Password
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function DeactivateAccountAction() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [disableError, setDisableError] = useState("");
  const clearOutbox = useOutboxStore((state) => state.clearOutbox);
  const { key: deactivateKey, resetKey: resetDeactivateKey } = useIdempotency();

  const { mutate: deactivateProfile, isPending: isDeactivating } = useMutation({
    mutationFn: async () =>
      await api.delete("/users/me/deactivate-profile", {
        headers: { "x-idempotency-key": deactivateKey },
      }),
    onSuccess: () => {
      queryClient.clear();
      clearOutbox();
      window.location.href = "/login";
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setDisableError(
        err.response?.data?.message || "Failed to deactivate account.",
      );
    },
    onSettled: () => resetDeactivateKey(),
  });

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setDisableError("");
          setConfirmText("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30 transition-all duration-200 active:scale-[0.98]"
        >
          <ShieldAlert className="size-4 mr-1" />
          Disable Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className=" text-center text-sm font-medium text-destructive uppercase tracking-wider">
            Disable Account
          </DialogTitle>
          <DialogDescription className="sr-only">
            Type DEACTIVATE to disable your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
            Warning: Disabling your account will hide your profile from all
            users.
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-foreground">
              Type <span className="font-bold select-all">DEACTIVATE</span> to
              confirm:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (disableError) setDisableError("");
              }}
              placeholder="DEACTIVATE"
              className="text-center"
            />
          </div>

          {disableError && (
            <p className="text-xs text-destructive font-medium animate-in fade-in text-center">
              {disableError}
            </p>
          )}

          <div className="space-y-3 pt-2">
            <Button
              variant="destructive"
              className="w-full transition-all duration-200 active:scale-[0.98]"
              onClick={() => deactivateProfile()}
              disabled={confirmText !== "DEACTIVATE" || isDeactivating}
            >
              {isDeactivating && (
                <Loader
                  inline
                  className="size-4 mr-2 text-destructive-foreground"
                />
              )}
              Disable account
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You can reactivate your account anytime by logging back in.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LogoutActions() {
  const queryClient = useQueryClient();
  const clearOutbox = useOutboxStore((state) => state.clearOutbox);

  const handleLogoutSuccess = () => {
    queryClient.clear();
    clearOutbox();
    window.location.href = "/login";
  };

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => await api.post("/auth/logout"),
    onSuccess: handleLogoutSuccess,
  });

  const { mutate: logoutAll, isPending: isLoggingOutAll } = useMutation({
    mutationFn: async () => await api.post("/auth/logout-all"),
    onSuccess: handleLogoutSuccess,
  });

  return (
    <>
      <Button
        variant="secondary"
        className="w-full transition-all duration-200 active:scale-[0.98]"
        onClick={() => logout()}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <Loader inline className="size-4 mr-1" />
        ) : (
          <LogOut className="size-4 mr-1" />
        )}
        Logout
      </Button>
      <Button
        variant="outline"
        className="w-full text-foreground/85 hover:text-foreground transition-all duration-200 active:scale-[0.98]"
        onClick={() => logoutAll()}
        disabled={isLoggingOutAll}
      >
        {isLoggingOutAll && <Loader inline className="size-4 mr-1" />}
        Logout from all devices
      </Button>
    </>
  );
}
