import { create } from 'zustand'
import { MODULE_PANEL, SIDE_PANEL, SIDEBAR } from '@/app/layout'
import { readBoolean, readInt, STORAGE_KEYS, writeBoolean, writeString } from '@/lib/storage'
import type { StudyStatus } from '@/types'

export type SettingsTab = 'study' | 'ai' | 'data' | 'sync'

/** Tabs of the question detail side panel. */
export type SidePanelTab = 'notes' | 'ai'

export type ModuleStatusFilter = 'all' | StudyStatus

interface UIState {
  settingsOpen: boolean
  settingsTab: SettingsTab
  onboardingOpen: boolean
  mobileNavOpen: boolean
  paletteOpen: boolean
  /** Expanded sidebar width in px (kept while collapsed so expanding restores it). */
  sidebarWidth: number
  sidebarCollapsed: boolean
  /** Open tab of the detail side panel, or null when closed. Survives question navigation. */
  sidePanel: SidePanelTab | null
  sidePanelWidth: number
  /** Whether the detail page's module question list stays docked on wide screens. */
  modulePanelPinned: boolean
  modulePanelWidth: number
  /** Search and status filter of the module list; kept in memory across questions. */
  moduleListQuery: string
  moduleListStatus: ModuleStatusFilter
  /** Open the settings dialog, optionally on a specific tab. */
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
  setSettingsTab: (tab: SettingsTab) => void
  setOnboardingOpen: (open: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  /** Open the side panel on `tab`, or close it if that tab is already showing. */
  toggleSidePanel: (tab: SidePanelTab) => void
  setSidePanel: (tab: SidePanelTab | null) => void
  setSidePanelWidth: (width: number) => void
  setModulePanelPinned: (pinned: boolean) => void
  setModulePanelWidth: (width: number) => void
  setModuleListQuery: (query: string) => void
  setModuleListStatus: (status: ModuleStatusFilter) => void
}

/** App-shell UI state that several unrelated components need to drive. */
export const useUIState = create<UIState>()((set) => ({
  settingsOpen: false,
  settingsTab: 'study',
  onboardingOpen: false,
  mobileNavOpen: false,
  paletteOpen: false,
  sidebarWidth: readInt(STORAGE_KEYS.sidebarWidth, SIDEBAR.default, SIDEBAR.min, SIDEBAR.max),
  sidebarCollapsed: readBoolean(STORAGE_KEYS.sidebarCollapsed, false),
  sidePanel: null,
  sidePanelWidth: readInt(
    STORAGE_KEYS.sidePanelWidth,
    SIDE_PANEL.default,
    SIDE_PANEL.min,
    SIDE_PANEL.max,
  ),
  modulePanelPinned: readBoolean(STORAGE_KEYS.modulePanelPinned, false),
  modulePanelWidth: readInt(
    STORAGE_KEYS.modulePanelWidth,
    MODULE_PANEL.default,
    MODULE_PANEL.min,
    MODULE_PANEL.max,
  ),
  moduleListQuery: '',
  moduleListStatus: 'all',
  openSettings: (tab) =>
    set((state) => ({
      settingsOpen: true,
      settingsTab: tab ?? state.settingsTab,
      mobileNavOpen: false,
    })),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen, settingsOpen: false }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen, mobileNavOpen: false }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleSidePanel: (tab) => set((state) => ({ sidePanel: state.sidePanel === tab ? null : tab })),
  setSidePanel: (sidePanel) => set({ sidePanel }),
  setSidePanelWidth: (sidePanelWidth) => set({ sidePanelWidth }),
  setModulePanelPinned: (modulePanelPinned) => set({ modulePanelPinned }),
  setModulePanelWidth: (modulePanelWidth) => set({ modulePanelWidth }),
  setModuleListQuery: (moduleListQuery) => set({ moduleListQuery }),
  setModuleListStatus: (moduleListStatus) => set({ moduleListStatus }),
}))

// Persist layout preferences, debounced so a drag doesn't write on every pointer move.
let persistTimer: ReturnType<typeof setTimeout> | undefined

function writeLayoutPrefs() {
  persistTimer = undefined
  const latest = useUIState.getState()
  writeString(STORAGE_KEYS.sidebarWidth, String(latest.sidebarWidth))
  writeBoolean(STORAGE_KEYS.sidebarCollapsed, latest.sidebarCollapsed)
  writeString(STORAGE_KEYS.sidePanelWidth, String(latest.sidePanelWidth))
  writeBoolean(STORAGE_KEYS.modulePanelPinned, latest.modulePanelPinned)
  writeString(STORAGE_KEYS.modulePanelWidth, String(latest.modulePanelWidth))
}

useUIState.subscribe((state, prev) => {
  if (
    state.sidebarWidth === prev.sidebarWidth &&
    state.sidebarCollapsed === prev.sidebarCollapsed &&
    state.sidePanelWidth === prev.sidePanelWidth &&
    state.modulePanelPinned === prev.modulePanelPinned &&
    state.modulePanelWidth === prev.modulePanelWidth
  ) {
    return
  }
  clearTimeout(persistTimer)
  persistTimer = setTimeout(writeLayoutPrefs, 200)
})

// Don't lose a change made just before the page is closed or reloaded.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (persistTimer === undefined) return
    clearTimeout(persistTimer)
    writeLayoutPrefs()
  })
}
