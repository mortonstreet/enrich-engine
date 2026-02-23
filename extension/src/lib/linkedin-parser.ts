import type { LinkedInProfile } from '@/types'

// Patterns to detect LinkedIn profile pages
const PROFILE_PATTERNS = [
  /linkedin\.com\/in\/([^/?#]+)/,             // Standard profile
  /linkedin\.com\/sales\/lead\/([^/?#]+)/,    // Sales Navigator lead
  /linkedin\.com\/sales\/people\/([^/?#]+)/,  // Sales Navigator people
  /linkedin\.com\/talent\/profile\/([^/?#]+)/, // LinkedIn Recruiter profile
]

export function isProfilePage(url: string): boolean {
  const matches = PROFILE_PATTERNS.some(p => p.test(url))
  console.log('[OmniDial] isProfilePage check:', { url, matches })
  return matches
}

export function normalizeLinkedInUrl(url: string): string {
  const decodeSafe = (value: string) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const extractCanonicalProfile = (value: string): string | null => {
    const decoded = decodeSafe(value)
    const inMatch = decoded.match(/linkedin\.com\/in\/([^/?#]+)/i)
    if (inMatch?.[1]) {
      return `https://www.linkedin.com/in/${inMatch[1].toLowerCase()}`
    }
    return null
  }

  const directProfile = extractCanonicalProfile(url)
  if (directProfile) return directProfile

  try {
    const parsed = new URL(url, window.location.origin)
    for (const queryValue of parsed.searchParams.values()) {
      const profileFromQuery = extractCanonicalProfile(queryValue)
      if (profileFromQuery) return profileFromQuery
    }

    const salesLeadMatch = parsed.pathname.match(/\/sales\/lead\/([^/?#,]+)/i)
    if (salesLeadMatch?.[1]) {
      return `https://www.linkedin.com/sales/lead/${salesLeadMatch[1].toLowerCase()}`
    }

    const salesPeopleMatch = parsed.pathname.match(
      /\/sales\/people\/([^/?#,]+)/i,
    )
    if (salesPeopleMatch?.[1]) {
      return `https://www.linkedin.com/sales/people/${salesPeopleMatch[1].toLowerCase()}`
    }

    if (parsed.hostname.includes('linkedin.com')) {
      return `https://www.linkedin.com${parsed.pathname}`.replace(/\/$/, '')
    }
  } catch {
    // Fallback below
  }

  return url
}

/**
 * Get the raw URL from the page for Prospeo.
 * Prospeo can handle LinkedIn URLs including Sales Navigator.
 */
export function getRawProfileUrl(): string {
  return window.location.href.split('#')[0]
}

/**
 * Extract profile data from JSON-LD structured data embedded by LinkedIn.
 * This is the most reliable method as it follows schema.org's Person vocabulary.
 */
function extractFromJsonLd(): Partial<LinkedInProfile> {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '')
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Person') {
          return {
            fullName: item.name,
            firstName: item.givenName,
            lastName: item.familyName,
            headline: Array.isArray(item.jobTitle) ? item.jobTitle[0] : item.jobTitle,
            company: item.worksFor?.[0]?.name,
            location: [item.address?.addressLocality, item.address?.addressRegion]
              .filter(Boolean)
              .join(', ') || undefined,
          }
        }
      }
    } catch {
      // Continue to next script tag
    }
  }
  return {}
}

/**
 * Extract from meta tags (og:title, etc.)
 */
function extractFromMetaTags(): Partial<LinkedInProfile> {
  const result: Partial<LinkedInProfile> = {}

  // og:title often has "FirstName LastName - Title | LinkedIn"
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
  if (ogTitle) {
    const match = ogTitle.match(/^(.+?)\s*[-–|]/)
    if (match && isValidName(match[1].trim())) {
      result.fullName = match[1].trim()
    }
  }

  // og:description often has headline/title info
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
  if (ogDesc && ogDesc.length > 5 && ogDesc.length < 300) {
    result.headline = ogDesc
  }

  return result
}

/**
 * Validate that a string looks like a real person's name.
 * Filters out common false positives like "Sign in", "500+ connections", etc.
 */
function isValidName(text: string): boolean {
  if (!text || text.length < 2 || text.length > 100) return false
  const invalidPatterns = [
    /^\d+/,           // Starts with numbers (e.g., "500+ connections")
    /connection/i,
    /follower/i,
    /sign in/i,
    /premium/i,
    /linkedin/i,
    /^home$/i,
    /^my network$/i,
    /^jobs$/i,
    /^messaging$/i,
    /^notifications$/i,
  ]
  return !invalidPatterns.some(p => p.test(text))
}

// Cache JSON-LD data to avoid repeated parsing
let jsonLdCache: Partial<LinkedInProfile> | null = null
let metaCache: Partial<LinkedInProfile> | null = null

export function extractProfileData(): LinkedInProfile {
  // Use the raw URL for API calls (Prospeo can handle various LinkedIn URL formats)
  const rawUrl = getRawProfileUrl()
  // Also get normalized URL for display/matching
  const profileUrl = normalizeLinkedInUrl(rawUrl)

  // Debug: Log the URL being used
  console.log('[OmniDial] URL detection:', {
    rawUrl,
    normalizedUrl: profileUrl,
    windowHref: window.location.href,
  })

  // Extract structured data first (most reliable)
  jsonLdCache = extractFromJsonLd()
  metaCache = extractFromMetaTags()

  // Debug: Log what we found in structured data
  console.log('[OmniDial] Structured data found:', {
    jsonLd: jsonLdCache,
    meta: metaCache,
  })

  // Extract name - prefer JSON-LD, then meta tags, then DOM
  const fullName = extractFullName()

  // Use JSON-LD firstName/lastName if available, otherwise split the name
  const firstName = jsonLdCache?.firstName || splitName(fullName).firstName
  const lastName = jsonLdCache?.lastName || splitName(fullName).lastName

  const headline = extractHeadline()
  const company = extractCompany(headline)
  const location = extractLocation()

  // Debug logging with extraction sources
  const extractionSources = {
    nameSource: jsonLdCache?.fullName ? 'JSON-LD' : metaCache?.fullName ? 'meta' : 'DOM/title',
    headlineSource: jsonLdCache?.headline ? 'JSON-LD' : metaCache?.headline ? 'meta' : 'DOM',
    companySource: jsonLdCache?.company ? 'JSON-LD' : 'headline/DOM',
    locationSource: jsonLdCache?.location ? 'JSON-LD' : 'DOM',
  }

  console.log('[OmniDial] Extracted profile:', {
    profileUrl,
    fullName,
    firstName,
    lastName,
    headline,
    company,
    location,
  })
  console.log('[OmniDial] Extraction sources:', extractionSources)

  if (!fullName) {
    console.warn('[OmniDial] WARNING: Could not extract name from LinkedIn page. DOM structure may have changed.')
    console.warn('[OmniDial] Page title:', document.title)
    console.warn('[OmniDial] JSON-LD scripts found:', document.querySelectorAll('script[type="application/ld+json"]').length)
  }
  if (!firstName || !lastName) {
    console.warn('[OmniDial] WARNING: Missing firstName or lastName - enrichment may be required')
  }

  return {
    profileUrl,
    fullName,
    firstName,
    lastName,
    headline,
    company,
    location,
  }
}

function extractFullName(): string {
  console.log('[OmniDial] Extracting name, page title:', document.title)

  // 1. Page title is often the most reliable (e.g., "Anthony Taylor - President | LinkedIn")
  // Handle various separators: -, –, |, ·
  const titleMatch = document.title.match(/^(.+?)\s*[-–|·]\s*/)
  if (titleMatch?.[1]) {
    const titleName = titleMatch[1].trim()
    console.log('[OmniDial] Title parsed name candidate:', titleName)
    if (isValidName(titleName)) {
      console.log('[OmniDial] Name from title:', titleName)
      return titleName
    }
  }

  // Also try splitting by " | LinkedIn" specifically
  if (document.title.includes(' | LinkedIn')) {
    const parts = document.title.split(' | LinkedIn')[0]
    const nameMatch = parts.match(/^(.+?)\s*[-–]/)
    if (nameMatch?.[1] && isValidName(nameMatch[1].trim())) {
      console.log('[OmniDial] Name from title (LinkedIn split):', nameMatch[1].trim())
      return nameMatch[1].trim()
    }
  }

  // 2. JSON-LD (reliable when present)
  if (jsonLdCache?.fullName && isValidName(jsonLdCache.fullName)) {
    console.log('[OmniDial] Name from JSON-LD:', jsonLdCache.fullName)
    return jsonLdCache.fullName
  }

  // 3. Meta tags
  if (metaCache?.fullName && isValidName(metaCache.fullName)) {
    console.log('[OmniDial] Name from meta:', metaCache.fullName)
    return metaCache.fullName
  }

  // 4. Modern LinkedIn CSS selectors (2024/2025)
  const selectors = [
    // Primary name heading - LinkedIn uses h1 for the name
    'h1.text-heading-xlarge',
    'h1.inline.t-24.v-align-middle.break-words',
    // Profile top card area
    '.pv-text-details__left-panel h1',
    '.ph5.pb5 h1',
    '.mt2.relative h1',
    // Generic h1 in main profile section
    'main section h1',
    'section.artdeco-card h1',
    '.scaffold-layout__main h1',
    // Fallback selectors
    '[data-generated-suggestion-target="urn:li:fsu_profileActionDelegate"] h1',
    'div[data-view-name="profile-card"] h1',
  ]

  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el) {
        // Get direct text content, excluding child elements like badges
        let text = ''
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent
          }
        }
        text = text.trim()

        // If no direct text, fall back to full textContent
        if (!text) {
          text = el.textContent?.trim() || ''
        }

        // Clean up - remove verification badge text, etc
        text = text.replace(/\s+/g, ' ').trim()

        if (text && isValidName(text)) {
          console.log('[OmniDial] Name from selector', sel, ':', text)
          return text
        }
      }
    } catch {
      // Selector might be invalid, continue
    }
  }

  // 5. Look for any h1 element and check if it looks like a name
  const allH1s = document.querySelectorAll('h1')
  for (const h1 of allH1s) {
    const text = h1.textContent?.trim()
    if (text && isValidName(text) && text.split(' ').length >= 2 && text.split(' ').length <= 5) {
      console.log('[OmniDial] Name from h1 fallback:', text)
      return text
    }
  }

  // 6. Sales Navigator
  const salesNavName = document.querySelector('[data-anonymize="person-name"]')
  if (salesNavName?.textContent?.trim() && isValidName(salesNavName.textContent.trim())) {
    console.log('[OmniDial] Name from Sales Navigator:', salesNavName.textContent.trim())
    return salesNavName.textContent.trim()
  }

  // 7. Look for aria-label on profile photo that contains name
  const profilePhoto = document.querySelector('img[alt*="photo"], img[aria-label]')
  if (profilePhoto) {
    const alt = profilePhoto.getAttribute('alt') || profilePhoto.getAttribute('aria-label') || ''
    // "John Smith's photo" or similar
    const photoMatch = alt.match(/^(.+?)(?:'s?\s+photo|'s?\s+profile)/i)
    if (photoMatch && isValidName(photoMatch[1])) {
      console.log('[OmniDial] Name from photo alt:', photoMatch[1])
      return photoMatch[1]
    }
  }

  console.warn('[OmniDial] Could not extract name from any source')
  return ''
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function extractHeadline(): string {
  // 1. JSON-LD (most reliable)
  if (jsonLdCache?.headline) {
    return jsonLdCache.headline
  }

  // 2. Meta tags
  if (metaCache?.headline) {
    return metaCache.headline
  }

  // 3. Modern LinkedIn CSS selectors (2024+)
  const selectors = [
    // Headline div directly after name
    '.text-body-medium.break-words',
    'div.text-body-medium',
    // Profile details section
    '.pv-text-details__left-panel .text-body-medium',
    '[data-generated-suggestion-target*="headline"]',
    // Top card area
    '.ph5 .text-body-medium',
    '.mt2 .text-body-medium',
    'main section:first-of-type .text-body-medium',
    'section.artdeco-card .text-body-medium',
    // Class patterns
    '[class*="text-body-medium"]',
  ]

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        const text = el?.textContent?.trim()
        // Headline should be reasonably long but not too long, and not navigation text
        if (text && text.length > 5 && text.length < 250 && !text.includes('connection') && !text.includes('follower')) {
          return text
        }
      }
    } catch {
      // Continue
    }
  }

  // 4. Look for the div right after the h1 name
  const h1 = document.querySelector('h1.text-heading-xlarge') ||
             document.querySelector('main h1') ||
             document.querySelector('section.artdeco-card h1')
  if (h1) {
    // Try immediate next sibling
    let sibling = h1.nextElementSibling
    while (sibling) {
      const text = sibling.textContent?.trim()
      if (text && text.length > 5 && text.length < 250 && !text.includes('connection')) {
        return text
      }
      sibling = sibling.nextElementSibling
      // Don't go too far
      if (!sibling?.classList?.contains('text-body-medium')) break
    }

    // Try parent's siblings
    const parent = h1.parentElement
    if (parent) {
      const siblings = Array.from(parent.parentElement?.children || [])
      const h1Index = siblings.indexOf(parent)
      for (let i = h1Index + 1; i < siblings.length && i < h1Index + 3; i++) {
        const text = siblings[i]?.textContent?.trim()
        if (text && text.length > 5 && text.length < 250 && !text.includes('connection')) {
          return text
        }
      }
    }
  }

  // 5. Sales Navigator
  const salesNavHeadline = document.querySelector('[data-anonymize="headline"]')
  if (salesNavHeadline?.textContent?.trim()) {
    return salesNavHeadline.textContent.trim()
  }

  return ''
}

function extractCompany(headline: string): string {
  // 1. JSON-LD (most reliable)
  if (jsonLdCache?.company) {
    return jsonLdCache.company
  }

  // 2. Extract from headline first (e.g., "VP of Sales at Acme Corp")
  // This is often the most accurate for current position
  if (headline) {
    const atMatch = headline.match(/(?:\bat\b|@)\s+(.+?)(?:\s*[|·•,]|$)/i)
    if (atMatch) {
      return atMatch[1].trim()
    }
  }

  // 3. Look for company link in top card area (near the name)
  const topCardSelectors = [
    '.ph5 a[href*="/company/"]',
    '.mt2 a[href*="/company/"]',
    '.pv-text-details__left-panel a[href*="/company/"]',
    'main section:first-child a[href*="/company/"]',
    '.pv-top-card a[href*="/company/"]',
    'section.artdeco-card a[href*="/company/"]',
  ]

  for (const sel of topCardSelectors) {
    try {
      const companyLink = document.querySelector(sel)
      const text = companyLink?.textContent?.trim()
      if (text && text.length > 1 && text.length < 100) {
        return text
      }
    } catch {
      // Continue
    }
  }

  // 4. Look for company in the "Experience" section (current job)
  const experienceSection = document.querySelector('#experience') ||
    document.querySelector('section:has(#experience)') ||
    document.querySelector('[id*="experience"]') ||
    document.querySelector('[data-section="experience"]')

  if (experienceSection) {
    // Look for the first company name in experience
    const companyLinks = experienceSection.querySelectorAll('a[href*="/company/"]')
    if (companyLinks.length > 0) {
      const companyText = companyLinks[0]?.textContent?.trim()
      if (companyText) {
        return companyText
      }
    }

    // Try spans that might contain company name
    const spans = experienceSection.querySelectorAll('span.t-14, span.t-normal, span.t-bold')
    for (const span of spans) {
      const text = span.textContent?.trim()
      if (text && !text.includes('·') && text.length > 2 && text.length < 100) {
        return text.split('·')[0].trim()
      }
    }
  }

  // 5. Look for "current company" button/link near profile
  const currentCompany = document.querySelector('button[aria-label*="Current company"]')
  if (currentCompany) {
    const text = currentCompany.textContent?.trim()
    if (text) return text
  }

  // 6. Sales Navigator
  const salesNavCompany = document.querySelector('[data-anonymize="company-name"]')
  if (salesNavCompany?.textContent?.trim()) {
    return salesNavCompany.textContent.trim()
  }

  return ''
}

function extractLocation(): string {
  // 1. JSON-LD (most reliable)
  if (jsonLdCache?.location) {
    return jsonLdCache.location
  }

  // 2. Modern LinkedIn location selectors (2024+)
  const selectors = [
    // Location is usually in a span near the headline
    '.text-body-small.inline.t-black--light.break-words',
    '.pv-text-details__left-panel .text-body-small',
    '.pv-top-card--list-bullet .text-body-small',
    '[data-field="location"]',
    '.ph5 .text-body-small',
    '.mt2 .text-body-small',
    'section.artdeco-card .text-body-small',
  ]

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        const text = el?.textContent?.trim()
        // Location should not be connection counts or other UI elements
        if (text &&
            !text.includes('connection') &&
            !text.includes('follower') &&
            !text.includes('Contact info') &&
            !text.includes('Open to') &&
            text.length > 2 &&
            text.length < 100) {
          // Check if it looks like a location
          if (looksLikeLocation(text)) {
            return text
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Try finding location by looking for geographic-like text patterns
  const locationPatterns = [
    /^[A-Z][a-z]+(?:,\s*[A-Z]{2})?$/,  // "City" or "City, ST"
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+/,      // "City, Country"
    /Area$/,                              // "San Francisco Bay Area"
    /Metropolitan/,                       // "New York Metropolitan Area"
  ]

  const smallTexts = document.querySelectorAll('.text-body-small')
  for (const el of smallTexts) {
    const text = el.textContent?.trim()
    if (text && locationPatterns.some(p => p.test(text))) {
      return text
    }
  }

  // 4. Sales Navigator
  const salesNavLocation = document.querySelector('[data-anonymize="location"]')
  if (salesNavLocation?.textContent?.trim()) {
    return salesNavLocation.textContent.trim()
  }

  return ''
}

/**
 * Check if text looks like a location string
 */
function looksLikeLocation(text: string): boolean {
  // Common location patterns
  const patterns = [
    /,\s*[A-Z]{2}$/,                    // Ends with ", CA" or ", NY"
    /,\s*[A-Z][a-z]+$/,                 // Ends with ", Country"
    /Area$/i,                            // Ends with "Area"
    /Metropolitan/i,                     // Contains "Metropolitan"
    /Greater\s/i,                        // Starts with "Greater"
    /^[A-Z][a-z]+,\s*[A-Z]/,            // "City, State/Country"
  ]
  return patterns.some(p => p.test(text))
}
