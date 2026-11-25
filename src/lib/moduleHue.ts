/** Categorical colours for question modules, backed by the `hue-*` design tokens. */
export const MODULE_HUES = [
  'blue',
  'violet',
  'pink',
  'rose',
  'orange',
  'amber',
  'green',
  'teal',
  'cyan',
] as const

export type ModuleHue = (typeof MODULE_HUES)[number]

/**
 * Hue for a module: the colour its bank asked for, otherwise a stable hash of its name so
 * modules without one still look distinct.
 */
export function moduleHue(name: string, requested?: string): ModuleHue {
  if (requested && (MODULE_HUES as readonly string[]).includes(requested)) {
    return requested as ModuleHue
  }
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return MODULE_HUES[hash % MODULE_HUES.length]
}
