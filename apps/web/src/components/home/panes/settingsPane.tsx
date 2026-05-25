"use client";

import { useMe } from "@/hooks/queries/useMe";
import { useMetadata } from "@/hooks/queries/useMetadata";
import { api } from "@/lib/axios";
import { Accordion } from "@matcha/ui/components/accordion";
import { Loader } from "@matcha/ui/components/loader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AboutMeSetting,
  AvatarSetting,
  DeactivateAccountAction,
  DiscoverySetting,
  InterestSetting,
  LocationSetting,
  LogoutActions,
  OpeningQuesSetting,
  PasswordSetting,
  UsernameSetting,
} from "./settingsSections";

export function SettingsPane() {
  const { data: metadata, isLoading: isMetadataLoading } = useMetadata();
  const { data: profile, isLoading: isProfileLoading } = useMe();

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      <div className="p-4 border-b border-border/50 pb-4 shrink-0">
        <h2 className="text-2xl font-semibold tracking-tight">My Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {isProfileLoading || isMetadataLoading || !profile || !metadata ? (
          <div className="flex h-full items-center justify-center">
            <Loader />
          </div>
        ) : (
          <SettingsForm profile={profile} metadata={metadata} />
        )}
      </div>
    </div>
  );
}

function SettingsForm({ profile, metadata }: { profile: any; metadata: any }) {
  const queryClient = useQueryClient();
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (data: any) => await api.patch("/users/me/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full">
        <UsernameSetting username={profile.username} />
        <AvatarSetting
          profile={profile}
          metadata={metadata}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <LocationSetting
          profile={profile}
          metadata={metadata}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <InterestSetting
          profile={profile}
          metadata={metadata}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <AboutMeSetting
          profile={profile}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <OpeningQuesSetting
          profile={profile}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <DiscoverySetting
          profile={profile}
          updateProfile={updateProfile}
          isUpdating={isUpdating}
        />
        <PasswordSetting />
      </Accordion>

      <div className="pt-6 space-y-3 border-t border-border/50">
        <DeactivateAccountAction />
        <LogoutActions />
      </div>
    </div>
  );
}
