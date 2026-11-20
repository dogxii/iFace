import { create } from 'zustand'

interface UIState {
  settingsOpen: boolean
  mobileNavOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  setMobileNavOpen: (open: boolean) => void
}

/** App-shell UI state that several unrelated components need to drive. */
export const useUIState = create<UIState>()((set) => ({
  settingsOpen: false,
  mobileNavOpen: false,
  openSettings: () => set({ settingsOpen: true, mobileNavOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}))
