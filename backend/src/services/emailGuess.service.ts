const NON_ALPHA_REGEX = /[^a-z]/g

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(NON_ALPHA_REGEX, '')
}

function normalizeDomain(domain: string): string | null {
  const normalized = domain
    .toLowerCase()
    .trim()
    .replace(/^www\./, '')
  if (!normalized || !normalized.includes('.')) return null
  return normalized
}

export function extractDomain(websiteOrDomain: string): string | null {
  const input = websiteOrDomain.trim()
  if (!input) return null

  const fromUrl = (() => {
    try {
      const candidate = input.match(/^https?:\/\//i)
        ? input
        : `https://${input}`
      return new URL(candidate).hostname
    } catch {
      return null
    }
  })()

  if (fromUrl) {
    return normalizeDomain(fromUrl)
  }

  const stripped = input
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
  return normalizeDomain(stripped)
}

export function guessAllEmails(
  domain: string,
  firstName: string,
  lastName: string,
): string[] {
  const normalizedDomain = extractDomain(domain)
  const first = normalizeName(firstName)
  const last = normalizeName(lastName)

  if (!normalizedDomain || !first || !last) return []

  const localParts = [
    `${first}.${last}`,
    `${first}`,
    `${first[0]}${last}`,
    `${first}${last}`,
    `${first}_${last}`,
    `${first[0]}.${last}`,
    `${last}.${first}`,
    `${last}`,
  ]

  return [...new Set(localParts.map((local) => `${local}@${normalizedDomain}`))]
}

export function guessEmail(
  domain: string,
  firstName: string,
  lastName: string,
): string | null {
  const candidates = guessAllEmails(domain, firstName, lastName)
  return candidates[0] ?? null
}

/**
 * Known email pattern templates.
 * Each pattern is a function that takes (first, last) and returns the local part.
 */
export const EMAIL_PATTERNS: Record<
  string,
  (first: string, last: string) => string
> = {
  'first.last': (f, l) => `${f}.${l}`,
  first: (f) => f,
  f_last: (f, l) => `${f[0]}${l}`,
  firstlast: (f, l) => `${f}${l}`,
  first_last: (f, l) => `${f}_${l}`,
  'f.last': (f, l) => `${f[0]}.${l}`,
  'last.first': (f, l) => `${l}.${f}`,
  last: (_f, l) => l,
  'first-last': (f, l) => `${f}-${l}`,
  last_first: (f, l) => `${l}_${f}`,
  flast: (f, l) => `${f[0]}${l}`,
}

/**
 * Given a known email and the person's name, detect which pattern the domain uses.
 * Returns the pattern key (e.g. "first.last") or null if unrecognized.
 */
export function detectEmailPattern(
  email: string,
  firstName: string,
  lastName: string,
): string | null {
  const [localPart, domain] = email.toLowerCase().split('@')
  if (!localPart || !domain) return null

  const first = normalizeName(firstName)
  const last = normalizeName(lastName)
  if (!first || !last) return null

  for (const [patternName, patternFn] of Object.entries(EMAIL_PATTERNS)) {
    if (patternFn(first, last) === localPart) {
      return patternName
    }
  }

  return null
}

/**
 * Apply a learned domain pattern to generate an email for a different person.
 */
export function applyEmailPattern(
  patternName: string,
  domain: string,
  firstName: string,
  lastName: string,
): string | null {
  const normalizedDomain = extractDomain(domain)
  const first = normalizeName(firstName)
  const last = normalizeName(lastName)
  if (!normalizedDomain || !first || !last) return null

  const patternFn = EMAIL_PATTERNS[patternName]
  if (!patternFn) return null

  return `${patternFn(first, last)}@${normalizedDomain}`
}
