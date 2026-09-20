import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

/** Desktop: Enter sends. Touch / on-screen keyboards: Enter is a newline. */
export function shouldSendOnEnter(event: ReactKeyboardEvent): boolean {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
    return false
  }
  return !window.matchMedia('(pointer: coarse)').matches
}
