import { create } from 'zustand';

interface AppState {
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  isRequestsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setRequestsOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSettingsOpen: false,
  isSearchOpen: false,
  isRequestsOpen: false,
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  setRequestsOpen: (isOpen) => set({ isRequestsOpen: isOpen }),
}));