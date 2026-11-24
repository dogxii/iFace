const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Display label for the command palette shortcut. */
export const PALETTE_SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K'
