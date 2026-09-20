/** First letter of a display name for the avatar fallback. Not a profile photo. */
export function profileAvatarInitial(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toLocaleUpperCase()
}
