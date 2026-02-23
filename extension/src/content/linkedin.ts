import {
  isProfilePage,
  extractProfileData,
  normalizeLinkedInUrl,
} from '../lib/linkedin-parser'
import type {
  LinkedInProfile,
  LinkedInSelectionItem,
  MessageToBackground,
} from '../types'

let lastUrl = ''
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let selectionRefreshTimer: ReturnType<typeof setTimeout> | null = null

const MAX_WAIT_MS = 5000
const POLL_INTERVAL_MS = 200
const PROFILE_LINK_SELECTOR =
  'a[href*="/in/"], a[href*="/sales/lead/"], a[href*="/sales/people/"]'
const PRIMARY_PROFILE_LINK_SELECTOR =
  '.entity-result__title-text a[href], [data-anonymize="person-name"] a[href], a[data-anonymize="person-name"][href]'
const CARD_CONTAINER_SELECTORS = [
  'li.reusable-search__result-container',
  '.entity-result',
  'li.search-result',
  '.discover-person-card',
  '.search-result__wrapper',
  '.artdeco-entity-lockup',
  '.scaffold-layout__list-item',
] as const
const SELECTION_TOGGLE_CLASS = 'omnidial-select-toggle'
const SELECTION_STYLE_ID = 'omnidial-selection-style'

/**
 * Wait for profile data indicators to appear in the DOM.
 * This is more reliable than a fixed timeout since LinkedIn's SPA
 * can take variable time to render profile content.
 */
async function waitForProfileData(): Promise<boolean> {
  const start = Date.now()

  // Indicators that profile data is available
  const indicators = [
    'script[type="application/ld+json"]', // JSON-LD structured data
    'section.artdeco-card h1', // Modern profile card
    'main section:first-child h1', // Main content h1
    '.pv-top-card h1', // Profile top card
  ]

  while (Date.now() - start < MAX_WAIT_MS) {
    for (const sel of indicators) {
      const el = document.querySelector(sel)
      if (el?.textContent?.trim()) {
        return true
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }

  // Timeout reached - still try to extract what we can
  return false
}

function sendProfileUpdate(profile: LinkedInProfile | null): void {
  chrome.runtime.sendMessage({
    type: 'PROFILE_DETECTED',
    data: profile,
  } satisfies MessageToBackground)
}

function sendBackgroundMessage<T>(message: MessageToBackground): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        resolve(null)
        return
      }
      resolve(response)
    })
  })
}

function sanitizeText(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function inferSourceType(): LinkedInSelectionItem['sourceType'] {
  const url = window.location.href
  if (url.includes('/sales/')) return 'sales_nav_search'
  if (url.includes('/search/')) return 'linkedin_search'
  return 'linkedin_recommended'
}

function isSelectionEligiblePage(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('linkedin.com')) return false

    const path = parsed.pathname.toLowerCase()
    return (
      path.startsWith('/search/results/') ||
      path.startsWith('/sales/search/') ||
      path.startsWith('/sales/lists/') ||
      path.startsWith('/mynetwork/')
    )
  } catch {
    return false
  }
}

function extractCompanyFromHeadline(headline: string): string | undefined {
  const atMatch = headline.match(/(?:\bat\b|@)\s+(.+?)(?:\s*[|·•,]|$)/i)
  if (atMatch?.[1]) return sanitizeText(atMatch[1])
  return undefined
}

function splitFullName(fullName?: string): {
  firstName?: string
  lastName?: string
} {
  const cleanName = sanitizeText(fullName)
  if (!cleanName) return {}

  const parts = cleanName.split(' ').filter(Boolean)
  if (parts.length < 2) {
    return { firstName: parts[0] }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function findProfileAnchor(card: Element): HTMLAnchorElement | null {
  const preferred = card.querySelector(PRIMARY_PROFILE_LINK_SELECTOR) as
    | HTMLAnchorElement
    | null
  if (preferred?.href) return preferred

  const anchors = Array.from(card.querySelectorAll(PROFILE_LINK_SELECTOR)) as
    | HTMLAnchorElement[]
  for (const anchor of anchors) {
    if (anchor.href) return anchor
  }
  return null
}

function extractSelectionItemFromCard(card: Element): LinkedInSelectionItem | null {
  const profileAnchor = findProfileAnchor(card)
  if (!profileAnchor?.href) return null

  const rawUrl = new URL(profileAnchor.href, window.location.origin).toString()
  const canonicalLinkedInUrl = normalizeLinkedInUrl(rawUrl)
  if (!canonicalLinkedInUrl.includes('linkedin.com')) return null

  const fullName = sanitizeText(
    card.querySelector('.entity-result__title-text span[aria-hidden="true"]')
      ?.textContent ||
      card.querySelector('[data-anonymize="person-name"]')?.textContent ||
      profileAnchor.textContent,
  )

  const headline = sanitizeText(
    card.querySelector('.entity-result__primary-subtitle')?.textContent ||
      card.querySelector('[data-anonymize="headline"]')?.textContent ||
      card.querySelector('.result-lockup__highlight-keyword')?.textContent,
  )

  const location = sanitizeText(
    card.querySelector('.entity-result__secondary-subtitle')?.textContent ||
      card.querySelector('[data-anonymize="location"]')?.textContent,
  )

  const { firstName, lastName } = splitFullName(fullName)

  return {
    canonicalLinkedInUrl,
    rawLinkedInUrl: rawUrl,
    fullName: fullName || undefined,
    firstName,
    lastName,
    headline: headline || undefined,
    company: extractCompanyFromHeadline(headline),
    location: location || undefined,
    sourcePageUrl: window.location.href,
    sourceType: inferSourceType(),
    capturedAt: new Date().toISOString(),
  }
}

function findSelectableCards(): Element[] {
  const cards: Element[] = []
  const seen = new Set<Element>()

  const anchors = Array.from(document.querySelectorAll(PROFILE_LINK_SELECTOR)) as
    | HTMLAnchorElement[]
  for (const anchor of anchors) {
    let card: Element | null = null
    for (const selector of CARD_CONTAINER_SELECTORS) {
      card = anchor.closest(selector)
      if (card) break
    }

    if (!card || seen.has(card)) continue

    const selectionItem = extractSelectionItemFromCard(card)
    if (!selectionItem?.canonicalLinkedInUrl) continue

    cards.push(card)
    seen.add(card)
  }

  for (const selector of CARD_CONTAINER_SELECTORS) {
    const elements = document.querySelectorAll(selector)
    for (const card of elements) {
      if (seen.has(card)) continue
      const selectionItem = extractSelectionItemFromCard(card)
      if (!selectionItem?.canonicalLinkedInUrl) continue
      cards.push(card)
      seen.add(card)
    }
  }

  return cards
}

function ensureSelectionStyles() {
  if (document.getElementById(SELECTION_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = SELECTION_STYLE_ID
  style.textContent = `
    .${SELECTION_TOGGLE_CLASS} {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 8px;
      background: rgba(10, 10, 12, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
      cursor: pointer;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      user-select: none;
    }

    .${SELECTION_TOGGLE_CLASS} input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: #10b981;
      cursor: pointer;
    }
  `
  document.head.appendChild(style)
}

function removeSelectionToggles(): void {
  document.querySelectorAll(`.${SELECTION_TOGGLE_CLASS}`).forEach((el) => {
    el.remove()
  })
}

async function refreshSelectionControls(): Promise<void> {
  if (
    isProfilePage(window.location.href) ||
    !isSelectionEligiblePage(window.location.href)
  ) {
    removeSelectionToggles()
    return
  }

  ensureSelectionStyles()

  const cards = findSelectableCards()
  if (cards.length === 0) {
    removeSelectionToggles()
    return
  }

  const cartSnapshot = await sendBackgroundMessage<{
    success: boolean
    items?: LinkedInSelectionItem[]
  }>({
    type: 'GET_SELECTION_CART',
  })

  const selected = new Set(
    (cartSnapshot?.items ?? []).map((item) => item.canonicalLinkedInUrl),
  )

  for (const card of cards) {
    const selection = extractSelectionItemFromCard(card)
    if (!selection) continue

    // Keep card position stable for overlay toggle.
    const cardElement = card as HTMLElement
    if (getComputedStyle(cardElement).position === 'static') {
      cardElement.style.position = 'relative'
    }

    let toggle = card.querySelector(`.${SELECTION_TOGGLE_CLASS}`) as
      | HTMLLabelElement
      | null
    const existingCanonical = toggle?.dataset.canonicalUrl
    if (toggle && existingCanonical && existingCanonical !== selection.canonicalLinkedInUrl) {
      toggle.remove()
      toggle = null
    }

    if (!toggle) {
      toggle = document.createElement('label')
      toggle.className = SELECTION_TOGGLE_CLASS
      toggle.dataset.canonicalUrl = selection.canonicalLinkedInUrl
      toggle.addEventListener('mousedown', (event) => {
        event.stopPropagation()
      })
      toggle.addEventListener('click', (event) => {
        event.stopPropagation()
      })

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = selected.has(selection.canonicalLinkedInUrl)
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation()
      })
      checkbox.onchange = async () => {
        const desiredState = checkbox.checked
        checkbox.disabled = true
        const latestSelection = extractSelectionItemFromCard(card) ?? selection
        const response = await sendBackgroundMessage<{
          success?: boolean
          selected?: boolean
        }>({
          type: 'SELECTION_TOGGLE',
          data: {
            item: latestSelection,
            selected: desiredState,
          },
        })
        if (response?.success) {
          checkbox.checked = response.selected ?? desiredState
        } else {
          checkbox.checked = !desiredState
        }
        const labelText = toggle?.querySelector('span')
        if (labelText) {
          labelText.textContent = checkbox.checked ? 'Selected' : 'Select'
        }
        checkbox.disabled = false
      }

      const labelText = document.createElement('span')
      labelText.textContent = checkbox.checked ? 'Selected' : 'Select'
      toggle.appendChild(checkbox)
      toggle.appendChild(labelText)
      cardElement.appendChild(toggle)
    } else {
      toggle.dataset.canonicalUrl = selection.canonicalLinkedInUrl
      const checkbox = toggle.querySelector('input')
      if (checkbox) {
        const isChecked = selected.has(selection.canonicalLinkedInUrl)
        checkbox.checked = isChecked
        const labelText = toggle.querySelector('span')
        if (labelText) {
          labelText.textContent = isChecked ? 'Selected' : 'Select'
        }
      }
    }
  }
}

function scheduleSelectionRefresh(delay = 140): void {
  if (selectionRefreshTimer) {
    clearTimeout(selectionRefreshTimer)
  }
  selectionRefreshTimer = setTimeout(() => {
    refreshSelectionControls().catch((error) => {
      console.error('[OmniDial] Failed to refresh selection controls:', error)
    })
  }, delay)
}

async function checkAndNotify(): Promise<void> {
  const currentUrl = window.location.href

  // Debounce rapid URL changes (LinkedIn SPA navigation)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    if (currentUrl === lastUrl) return
    lastUrl = currentUrl

    console.log('[OmniDial] Checking URL:', currentUrl)
    const isProfile = isProfilePage(currentUrl)
    console.log('[OmniDial] isProfilePage result:', isProfile)

    if (isProfile) {
      // Smart wait for profile data instead of fixed delay
      console.log('[OmniDial] Waiting for profile data indicators...')
      const foundIndicators = await waitForProfileData()
      console.log('[OmniDial] Profile indicators found:', foundIndicators)

      const profile = extractProfileData()
      console.log('[OmniDial] Sending profile update:', profile)
      sendProfileUpdate(profile)
    } else {
      // Not on a profile page - clear state
      console.log('[OmniDial] Not a profile page, clearing state')
      sendProfileUpdate(null)
    }
  }, 100)
}

// Initial check on page load
checkAndNotify()
scheduleSelectionRefresh(300)

// Watch for SPA navigation (LinkedIn is a single-page app)
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    checkAndNotify()
  }
  scheduleSelectionRefresh()
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
})

// Also listen for popstate (back/forward navigation)
window.addEventListener('popstate', () => {
  checkAndNotify()
  scheduleSelectionRefresh(60)
})

// Listen for messages from popup requesting current profile
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[OmniDial] Received message:', message.type)

  if (message.type === 'GET_PROFILE') {
    const currentUrl = window.location.href
    console.log('[OmniDial] GET_PROFILE request for URL:', currentUrl)

    if (isProfilePage(currentUrl)) {
      // Use async handler for smart waiting
      ;(async () => {
        try {
          console.log('[OmniDial] Waiting for profile data...')
          await waitForProfileData()
          const profile = extractProfileData()
          console.log('[OmniDial] Responding with profile:', profile)
          sendResponse(profile)
        } catch (error) {
          console.error('[OmniDial] Error extracting profile:', error)
          // Still try to return what we can
          sendResponse({
            profileUrl: currentUrl,
            fullName: '',
            firstName: undefined,
            lastName: undefined,
            headline: undefined,
            company: undefined,
            location: undefined,
          })
        }
      })()
      return true // Keep channel open for async response
    } else {
      console.log('[OmniDial] Not a profile page, responding null')
      sendResponse(null)
    }
    return true
  }

  if (
    message.type === 'SELECTION_CART_UPDATED' ||
    message.type === 'REFRESH_SELECTION_UI'
  ) {
    scheduleSelectionRefresh(0)
  }
})
