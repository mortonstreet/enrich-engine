import type {
  CheckLeadResponse,
  LinkedInProfile,
  SessionResponse,
  QuickContextResponse,
} from '@/types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = 'v2'
const CACHE_PREFIX = `cache:${CACHE_VERSION}`
const SESSION_KEY = `${CACHE_PREFIX}:session`
const ACTIVE_ORG_KEY = `${CACHE_PREFIX}:activeOrg`

interface CachedItem<T> {
  data: T
  timestamp: number
}

function getLeadLookupKey(orgId: string, linkedInUrl: string): string {
  return `${CACHE_PREFIX}:lead:${orgId}:${normalizeLinkedInUrl(linkedInUrl)}`
}

function getQuickContextKey(orgId: string): string {
  return `${CACHE_PREFIX}:quickContext:${orgId}`
}

async function clearOrgScopedCaches(): Promise<void> {
  const all = await chrome.storage.local.get(null)
  const keysToRemove = Object.keys(all).filter(
    (key) =>
      key.startsWith(`${CACHE_PREFIX}:lead:`) ||
      key.startsWith(`${CACHE_PREFIX}:quickContext:`),
  )

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove)
  }
}

async function ensureOrgScope(orgId: string | null | undefined): Promise<void> {
  if (!orgId) return

  const result = await chrome.storage.local.get(ACTIVE_ORG_KEY)
  const currentOrg = result[ACTIVE_ORG_KEY] as string | undefined
  if (currentOrg && currentOrg !== orgId) {
    await clearOrgScopedCaches()
  }

  await chrome.storage.local.set({ [ACTIVE_ORG_KEY]: orgId })
}

// Session cache
export async function getCachedSession(): Promise<SessionResponse | null> {
  const result = await chrome.storage.local.get(SESSION_KEY)
  const cached = result[SESSION_KEY] as CachedItem<SessionResponse> | undefined
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await chrome.storage.local.remove(SESSION_KEY)
    return null
  }
  return cached.data
}

export async function setCachedSession(
  session: SessionResponse,
): Promise<void> {
  await ensureOrgScope(session.organization?.id)
  await chrome.storage.local.set({
    [SESSION_KEY]: { data: session, timestamp: Date.now() },
  })
}

export async function clearCachedSession(): Promise<void> {
  await clearOrgScopedCaches()
  await chrome.storage.local.remove([SESSION_KEY, ACTIVE_ORG_KEY, 'currentProfile'])
}

// Lead lookup cache (keyed by normalized LinkedIn URL)
function normalizeLinkedInUrl(url: string): string {
  const decodeSafe = (value: string) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const extractProfile = (value: string): string | null => {
    const decoded = decodeSafe(value)
    const match = decoded.match(/linkedin\.com\/in\/([^/?#]+)/i)
    if (!match?.[1]) return null
    return `linkedin.com/in/${match[1].toLowerCase()}`
  }

  const direct = extractProfile(url)
  if (direct) return direct

  try {
    const parsed = new URL(url)
    for (const queryValue of parsed.searchParams.values()) {
      const fromQuery = extractProfile(queryValue)
      if (fromQuery) return fromQuery
    }
  } catch {
    // Fallback below
  }

  return decodeSafe(url).toLowerCase()
}

export async function getCachedLeadLookup(
  organizationId: string,
  linkedInUrl: string,
): Promise<CheckLeadResponse | null> {
  await ensureOrgScope(organizationId)
  const key = getLeadLookupKey(organizationId, linkedInUrl)
  const result = await chrome.storage.local.get(key)
  const cached = result[key] as CachedItem<CheckLeadResponse> | undefined
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await chrome.storage.local.remove(key)
    return null
  }
  return cached.data
}

export async function setCachedLeadLookup(
  organizationId: string,
  linkedInUrl: string,
  lead: CheckLeadResponse,
): Promise<void> {
  await ensureOrgScope(organizationId)
  const key = getLeadLookupKey(organizationId, linkedInUrl)
  await chrome.storage.local.set({
    [key]: { data: lead, timestamp: Date.now() },
  })
}

export async function clearCachedLeadLookup(
  organizationId: string,
  linkedInUrl: string,
): Promise<void> {
  await ensureOrgScope(organizationId)
  const key = getLeadLookupKey(organizationId, linkedInUrl)
  await chrome.storage.local.remove(key)
}

// Quick context cache (clients, campaigns, phone numbers)
export async function getCachedQuickContext(
  organizationId: string,
): Promise<QuickContextResponse | null> {
  await ensureOrgScope(organizationId)
  const key = getQuickContextKey(organizationId)
  const result = await chrome.storage.local.get(key)
  const cached = result[key] as CachedItem<QuickContextResponse> | undefined
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await chrome.storage.local.remove(key)
    return null
  }
  return cached.data
}

export async function setCachedQuickContext(
  organizationId: string,
  context: QuickContextResponse,
): Promise<void> {
  await ensureOrgScope(organizationId)
  const key = getQuickContextKey(organizationId)
  await chrome.storage.local.set({
    [key]: { data: context, timestamp: Date.now() },
  })
}

export async function clearCachedQuickContext(
  organizationId?: string,
): Promise<void> {
  if (!organizationId) {
    await clearOrgScopedCaches()
    return
  }
  await ensureOrgScope(organizationId)
  const key = getQuickContextKey(organizationId)
  await chrome.storage.local.remove(key)
}

// Current profile state
export async function getCurrentProfile(): Promise<LinkedInProfile | null> {
  const result = await chrome.storage.local.get('currentProfile')
  return result.currentProfile ?? null
}

export async function setCurrentProfile(
  profile: LinkedInProfile | null,
): Promise<void> {
  if (profile) {
    await chrome.storage.local.set({ currentProfile: profile })
  } else {
    await chrome.storage.local.remove('currentProfile')
  }
}
