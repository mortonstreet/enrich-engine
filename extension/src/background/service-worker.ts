import type {
  ExtensionState,
  LinkedInProfile,
  LinkedInSelectionItem,
  MessageToBackground,
} from '../types'

// Store current profile state per tab
const tabStates = new Map<number, ExtensionState>()
const tabProfiles = new Map<number, LinkedInProfile>()

// Selection cart state (scoped by user/org context from popup)
const tabSelectionScopes = new Map<number, string>()
const selectionCarts = new Map<string, Map<string, LinkedInSelectionItem>>()
const DEFAULT_SELECTION_SCOPE = 'anonymous'
const SELECTION_CART_STORAGE_PREFIX = 'selectionCart:v1:'
const LAST_SELECTION_SCOPE_STORAGE_KEY = 'selectionCart:v1:lastScope'
let lastKnownSelectionScope: string | null = null

function getSelectionCartStorageKey(scopeKey: string): string {
  return `${SELECTION_CART_STORAGE_PREFIX}${scopeKey}`
}

async function getLastSelectionScope(): Promise<string | null> {
  if (lastKnownSelectionScope) return lastKnownSelectionScope

  const stored = await chrome.storage.local.get(LAST_SELECTION_SCOPE_STORAGE_KEY)
  const storedScope = stored[LAST_SELECTION_SCOPE_STORAGE_KEY]
  if (typeof storedScope !== 'string' || !storedScope.trim()) {
    return null
  }

  lastKnownSelectionScope = storedScope
  return storedScope
}

async function setLastSelectionScope(scopeKey: string | null): Promise<void> {
  lastKnownSelectionScope = scopeKey
  if (scopeKey) {
    await chrome.storage.local.set({
      [LAST_SELECTION_SCOPE_STORAGE_KEY]: scopeKey,
    })
    return
  }

  await chrome.storage.local.remove(LAST_SELECTION_SCOPE_STORAGE_KEY)
}

async function resolveSelectionScope(
  tabId?: number,
  explicitScope?: string,
): Promise<string> {
  if (explicitScope) return explicitScope

  if (typeof tabId === 'number') {
    const tabScope = tabSelectionScopes.get(tabId)
    if (tabScope) return tabScope
  }

  const fallbackScope = (await getLastSelectionScope()) ?? DEFAULT_SELECTION_SCOPE
  if (typeof tabId === 'number' && fallbackScope !== DEFAULT_SELECTION_SCOPE) {
    tabSelectionScopes.set(tabId, fallbackScope)
  }
  return fallbackScope
}

async function loadSelectionCart(
  scopeKey: string,
): Promise<Map<string, LinkedInSelectionItem>> {
  const cached = selectionCarts.get(scopeKey)
  if (cached) return cached

  const key = getSelectionCartStorageKey(scopeKey)
  const stored = await chrome.storage.local.get(key)
  const items = (stored[key] as LinkedInSelectionItem[] | undefined) ?? []
  const cart = new Map<string, LinkedInSelectionItem>()
  for (const item of items) {
    cart.set(item.canonicalLinkedInUrl, item)
  }
  selectionCarts.set(scopeKey, cart)
  return cart
}

async function persistSelectionCart(scopeKey: string): Promise<void> {
  const key = getSelectionCartStorageKey(scopeKey)
  const cart = selectionCarts.get(scopeKey) ?? new Map()
  await chrome.storage.local.set({
    [key]: Array.from(cart.values()),
  })
}

async function getScopedSelectionCart(scopeKey: string): Promise<{
  cart: Map<string, LinkedInSelectionItem>
  migratedFromAnonymous: boolean
}> {
  const scopedCart = await loadSelectionCart(scopeKey)
  if (scopeKey === DEFAULT_SELECTION_SCOPE || scopedCart.size > 0) {
    return { cart: scopedCart, migratedFromAnonymous: false }
  }

  const anonymousCart = await loadSelectionCart(DEFAULT_SELECTION_SCOPE)
  if (anonymousCart.size === 0) {
    return { cart: scopedCart, migratedFromAnonymous: false }
  }

  const migrated = new Map<string, LinkedInSelectionItem>(anonymousCart)
  selectionCarts.set(scopeKey, migrated)
  selectionCarts.set(DEFAULT_SELECTION_SCOPE, new Map())
  await persistSelectionCart(scopeKey)
  await persistSelectionCart(DEFAULT_SELECTION_SCOPE)
  return { cart: migrated, migratedFromAnonymous: true }
}

async function broadcastSelectionCartUpdate(
  scopeKey: string,
  tabId?: number,
): Promise<void> {
  const cart = await loadSelectionCart(scopeKey)
  chrome.runtime.sendMessage({
    type: 'SELECTION_CART_UPDATED',
    data: {
      scopeKey,
      count: cart.size,
      items: Array.from(cart.values()),
    },
    tabId,
  })
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Set side panel behavior - open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // Fallback for older Chrome versions
})

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener(
  (message: MessageToBackground, sender, sendResponse) => {
    const senderTabId = sender.tab?.id

    ;(async () => {
      if (message.type === 'PROFILE_DETECTED' && senderTabId) {
        const profile = (message.data as LinkedInProfile | null | undefined) ?? null

        if (profile) {
          tabProfiles.set(senderTabId, profile)
          tabStates.set(senderTabId, { status: 'profile_detected', profile })
          chrome.action.setBadgeText({ tabId: senderTabId, text: '!' })
          chrome.action.setBadgeBackgroundColor({
            tabId: senderTabId,
            color: '#22c55e',
          })
        } else {
          tabProfiles.delete(senderTabId)
          tabStates.set(senderTabId, { status: 'not_linkedin' })
          chrome.action.setBadgeText({ tabId: senderTabId, text: '' })
        }

        // Forward with explicit tab scope so popup can ignore off-tab updates.
        chrome.runtime.sendMessage({
          type: 'PROFILE_DETECTED',
          data: profile,
          tabId: senderTabId,
        })

        sendResponse({ success: true })
        return
      }

      if (message.type === 'GET_STATE' && senderTabId) {
        const state = tabStates.get(senderTabId) ?? { status: 'not_linkedin' }
        const profile = tabProfiles.get(senderTabId)
        sendResponse({ state, profile })
        return
      }

      if (message.type === 'SET_SELECTION_SCOPE') {
        const data = (message.data as { scopeKey?: string } | undefined) ?? {}
        const scopeKey = data.scopeKey
        const targetTabId = message.tabId ?? senderTabId
        if (!scopeKey) {
          sendResponse({ success: false, error: 'scopeKey is required' })
          return
        }

        if (targetTabId) {
          tabSelectionScopes.set(targetTabId, scopeKey)
        }
        await setLastSelectionScope(scopeKey)

        const { cart, migratedFromAnonymous } = await getScopedSelectionCart(
          scopeKey,
        )
        if (migratedFromAnonymous) {
          await broadcastSelectionCartUpdate(scopeKey, targetTabId)
        }
        sendResponse({
          success: true,
          scopeKey,
          count: cart.size,
          items: Array.from(cart.values()),
        })
        return
      }

      if (message.type === 'CLEAR_SELECTION_SCOPE') {
        const targetTabId = message.tabId ?? senderTabId
        if (typeof targetTabId === 'number') {
          tabSelectionScopes.delete(targetTabId)
        } else {
          tabSelectionScopes.clear()
        }
        await setLastSelectionScope(null)
        sendResponse({ success: true })
        return
      }

      if (message.type === 'GET_SELECTION_CART') {
        const data = (message.data as { scopeKey?: string } | undefined) ?? {}
        const scopeKey = await resolveSelectionScope(
          message.tabId ?? senderTabId,
          data.scopeKey,
        )
        const cart = await loadSelectionCart(scopeKey)
        sendResponse({
          success: true,
          scopeKey,
          count: cart.size,
          items: Array.from(cart.values()),
        })
        return
      }

      if (message.type === 'GET_SELECTION_STATUS') {
        const data =
          (message.data as
            | { canonicalLinkedInUrl?: string; scopeKey?: string }
            | undefined) ?? {}
        const canonicalLinkedInUrl = data.canonicalLinkedInUrl
        if (!canonicalLinkedInUrl) {
          sendResponse({ success: false, selected: false })
          return
        }

        const scopeKey = await resolveSelectionScope(
          message.tabId ?? senderTabId,
          data.scopeKey,
        )
        const cart = await loadSelectionCart(scopeKey)
        sendResponse({
          success: true,
          selected: cart.has(canonicalLinkedInUrl),
          scopeKey,
        })
        return
      }

      if (message.type === 'SELECTION_TOGGLE') {
        const data =
          (message.data as
            | {
                item?: LinkedInSelectionItem
                selected?: boolean
                scopeKey?: string
              }
            | undefined) ?? {}
        const item = data.item
        const selected = !!data.selected
        if (!item?.canonicalLinkedInUrl) {
          sendResponse({ success: false, error: 'Invalid selection item' })
          return
        }

        const scopeKey = await resolveSelectionScope(
          message.tabId ?? senderTabId,
          data.scopeKey,
        )
        const cart = await loadSelectionCart(scopeKey)
        if (selected) {
          cart.set(item.canonicalLinkedInUrl, item)
        } else {
          cart.delete(item.canonicalLinkedInUrl)
        }
        await persistSelectionCart(scopeKey)
        await broadcastSelectionCartUpdate(scopeKey, senderTabId)
        sendResponse({
          success: true,
          selected,
          count: cart.size,
          scopeKey,
        })
        return
      }

      if (message.type === 'REMOVE_SELECTION') {
        const data =
          (message.data as
            | {
                canonicalLinkedInUrl?: string
                scopeKey?: string
              }
            | undefined) ?? {}
        if (!data.canonicalLinkedInUrl) {
          sendResponse({ success: false, error: 'Missing canonicalLinkedInUrl' })
          return
        }

        const scopeKey = await resolveSelectionScope(
          message.tabId ?? senderTabId,
          data.scopeKey,
        )
        const cart = await loadSelectionCart(scopeKey)
        cart.delete(data.canonicalLinkedInUrl)
        await persistSelectionCart(scopeKey)
        await broadcastSelectionCartUpdate(scopeKey, senderTabId)
        sendResponse({ success: true, count: cart.size, scopeKey })
        return
      }

      if (message.type === 'CLEAR_SELECTION_CART') {
        const data = (message.data as { scopeKey?: string } | undefined) ?? {}
        const scopeKey = await resolveSelectionScope(
          message.tabId ?? senderTabId,
          data.scopeKey,
        )
        selectionCarts.set(scopeKey, new Map())
        await persistSelectionCart(scopeKey)
        await broadcastSelectionCartUpdate(scopeKey, senderTabId)
        sendResponse({ success: true, count: 0, scopeKey })
        return
      }

      sendResponse({ success: false, error: `Unhandled message: ${message.type}` })
    })().catch((error) => {
      console.error('[OmniDial] Background message handler error:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown background error',
      })
    })

    return true
  },
)

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId)
  tabProfiles.delete(tabId)
  tabSelectionScopes.delete(tabId)
})

// Check for LinkedIn on tab update (initial navigation before content script runs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isLinkedIn = tab.url.includes('linkedin.com')
    if (!isLinkedIn) {
      tabStates.set(tabId, { status: 'not_linkedin' })
      chrome.action.setBadgeText({ tabId, text: '' })
    }
  }
})

// Handle popup connection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'GET_CURRENT_TAB_STATE') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          const state = tabStates.get(tab.id) ?? { status: 'not_linkedin' }
          const profile = tabProfiles.get(tab.id)
          port.postMessage({ type: 'STATE', state, profile, tabId: tab.id })
        }
      }
    })
  }
})
