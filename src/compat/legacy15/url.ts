// COMPAT: remove after 2027-06-30
/**
 * Pre-2.0 question URLs (`/questions/js-001`) used ids without a bank prefix. Official
 * questions kept their id as the local id, so the new key is `iface.<bank>:<old id>`.
 */
export function legacyQuestionKey(id: string, keys: Iterable<string>): string | null {
  if (!id || id.includes(':')) return null
  const suffix = `:${id}`
  for (const key of keys) {
    if (key.startsWith('iface.') && key.endsWith(suffix)) return key
  }
  return null
}
