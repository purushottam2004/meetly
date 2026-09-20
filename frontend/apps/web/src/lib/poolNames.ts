export function suggestUnusedPoolNames(base: string, takenNames: Set<string>): string[] {
  const stem = base.trim().toUpperCase()
  if (!stem) return []
  const taken = new Set([...takenNames].map((name) => name.toLowerCase()))
  const out: string[] = []
  let n = 2
  while (out.length < 3 && n < 50) {
    const candidate = `${stem}${n}`
    if (!taken.has(candidate.toLowerCase())) out.push(candidate)
    n += 1
  }
  const withYear = `${stem}${new Date().getUTCFullYear()}`
  if (out.length < 3 && !taken.has(withYear.toLowerCase())) out.push(withYear)
  return out
}
