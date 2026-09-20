/** True when frontend/.env has VITE_ENVIRONMENT=LOCAL (any casing). */
export function isLocalEnvironment(): boolean {
  const value = String(import.meta.env.VITE_ENVIRONMENT ?? '').trim().toLowerCase()
  return value === 'local'
}
