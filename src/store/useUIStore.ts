import { create } from 'zustand'

export type SettingsTab = 'study' | 'ai' | 'data' | 'sync'

interface UIState {
  settingsOpen: boolean
  settingsTab: SettingsTab
  mobileNavOpen: boolean
  paletteOpen: boolean
  /** Open the settings dialog, optionally on a specific tab. */
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
  setSettingsTab: (tab: SettingsTab) => void
  setMobileNavOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
}

/** App-shell UI state that several unrelated components need to drive. */
export const useUIState = create<UIState>()((set) => ({
  settingsOpen: false,
  settingsTab: 'study',
  mobileNavOpen: false,
  paletteOpen: false,
  openSettings: (tab) =>
    set((state) => ({
      settingsOpen: true,
      settingsTab: tab ?? state.settingsTab,
      mobileNavOpen: false,
    })),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen, mobileNavOpen: false }),
}))
