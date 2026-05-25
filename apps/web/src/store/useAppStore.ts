import { create } from 'zustand';

export type SidebarTab = 'chat' | 'requests' | 'search' | 'settings';

interface AppState {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab })
}));