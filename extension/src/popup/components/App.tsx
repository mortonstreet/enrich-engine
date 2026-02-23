import { useEffect, useRef, useState } from 'react'
import { Link, Phone, Users, AlertTriangle } from 'lucide-react'
import { AuthGate } from './AuthGate'
import { LeadPanel } from './LeadPanel'
import { EnrichAndPushButton } from './EnrichAndPushButton'
import { LeadBrowser } from './LeadBrowser'
import { AddToCampaignButton } from './AddToCampaignButton'
import { SettingsPanel } from './SettingsPanel'
import { BottomNav } from './BottomNav'
import { LinkedInSelectionCart } from './LinkedInSelectionCart'
import { CrmSelector } from './CrmSelector'
import { CrmBadges } from './CrmBadges'
import { VendorSettings } from './VendorSettings'
import { LogoIcon } from './brand/LogoIcon'
import { Logo3DSpinner } from './brand/Logo3DSpinner'
import {
  api,
  ExtensionContextError,
  isExtensionContextValid,
} from '../../lib/api'
import {
  getCachedSession,
  setCachedSession,
  getCachedLeadLookup,
  setCachedLeadLookup,
  getCachedQuickContext,
  setCachedQuickContext,
} from '../../lib/storage'
import type {
  SessionResponse,
  LinkedInProfile,
  CheckLeadResponse,
  QuickContextResponse,
  LeadListItem as LeadListItemType,
  CrmConnectionItem,
  CrmPresenceItem,
} from '../../types'
import type { NavTab } from './BottomNav'

type AppState =
  | { phase: 'loading' }
  | { phase: 'not_authenticated' }
  | {
      phase: 'ready'
      session: SessionResponse
      profile: LinkedInProfile | null
    }

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading' })
  const [lead, setLead] = useState<CheckLeadResponse | null>(null)
  const [context, setContext] = useState<QuickContextResponse | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<NavTab>('enrich')
  const [selectedDatabaseLead, setSelectedDatabaseLead] =
    useState<LeadListItemType | null>(null)
  const [selectedCrm, setSelectedCrm] = useState<string | null>(null)
  const [connectedCrms, setConnectedCrms] = useState<CrmConnectionItem[]>([])
  const [crmPresence, setCrmPresence] = useState<CrmPresenceItem[]>([])
  const [contextDead, setContextDead] = useState(false)
  const [selectionCount, setSelectionCount] = useState(0)
  const activeLinkedInTabIdRef = useRef<number | null>(null)
  const selectionScopeRef = useRef<string | null>(null)
  const stateEpochRef = useRef(0)

  const beginStateEpoch = (): number => {
    stateEpochRef.current += 1
    return stateEpochRef.current
  }

  const isStateEpochCurrent = (epoch: number): boolean =>
    stateEpochRef.current === epoch

  // Periodically check if extension context is still alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isExtensionContextValid()) {
        setContextDead(true)
        clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Initialize on mount
  useEffect(() => {
    void initialize()

    // Listen for tab URL changes to auto-refresh when navigating LinkedIn
    const handleTabUpdate = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (activeLinkedInTabIdRef.current !== tabId) return
      if (changeInfo.url && tab.url?.includes('linkedin.com')) {
        console.log(
          '[OmniDial] Tab URL changed, re-initializing:',
          changeInfo.url,
        )
        // Small delay to let content script detect the new page
        setTimeout(() => {
          void initialize()
        }, 500)
      }
    }

    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      // Re-evaluate active tab context for side panel when user switches tabs.
      activeLinkedInTabIdRef.current = activeInfo.tabId
      setTimeout(() => {
        void initialize()
      }, 200)
    }

    // Listen for profile updates pushed from content script (most reliable for SPA navigation)
    const handleMessage = (message: {
      type: string
      data?: unknown
      tabId?: number
    }, _sender: chrome.runtime.MessageSender) => {
      if (message.type === 'SELECTION_CART_UPDATED') {
        const payload = (message.data ?? {}) as {
          scopeKey?: string
          count?: number
        }
        if (
          selectionScopeRef.current &&
          payload.scopeKey &&
          payload.scopeKey !== selectionScopeRef.current
        ) {
          return
        }
        if (typeof payload.count === 'number') {
          setSelectionCount(payload.count)
        }
        return
      }

      if (message.type === 'PROFILE_DETECTED') {
        if (typeof message.tabId !== 'number') {
          return
        }
        const sourceTabId = message.tabId
        if (
          sourceTabId !== activeLinkedInTabIdRef.current
        ) {
          return
        }
        const profileData = (message.data ?? null) as LinkedInProfile | null
        console.log(
          '[OmniDial] Profile update received from content script:',
          profileData,
        )
        const epoch = beginStateEpoch()
        setError(null)
        setState((prev) => {
          if (prev.phase !== 'ready') return prev
          const profile = profileData
          if (profile) {
            // Profile detected - load lead data
            if (prev.session.organization?.id) {
              setLead(null) // Reset while loading new lead
              setJustAdded(false) // Reset for new profile
              setSelectedDatabaseLead(null)
              setCrmPresence([])
              void loadContextAndLead(
                prev.session.organization.id,
                profile.profileUrl,
                epoch,
              )
            }
          } else {
            setLead(null)
            setJustAdded(false)
            setSelectedDatabaseLead(null)
            setCrmPresence([])
          }
          return { ...prev, profile }
        })
        if (profileData) {
          setActiveTab('enrich')
        }
      }
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdate)
    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate)
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  async function initialize() {
    const epoch = beginStateEpoch()
    try {
      // Check session: prefer a fresh server read so org switches are respected.
      let session = await getCachedSession()
      try {
        const freshSession = await api.getSession()
        session = freshSession
        await setCachedSession(freshSession)
      } catch (sessionErr) {
        if (!session) {
          throw sessionErr
        }
      }

      if (!isStateEpochCurrent(epoch)) {
        return
      }

      if (!session.authenticated || !session.organization) {
        try {
          await chrome.runtime.sendMessage({
            type: 'CLEAR_SELECTION_SCOPE',
          })
        } catch (scopeError) {
          console.warn('Failed to clear selection scope:', scopeError)
        }

        activeLinkedInTabIdRef.current = null
        selectionScopeRef.current = null
        setSelectionCount(0)
        setLead(null)
        setContext(null)
        setCrmPresence([])
        setSelectedDatabaseLead(null)
        setJustAdded(false)
        setError(null)
        setState({ phase: 'not_authenticated' })
        return
      }
      setError(null)

      const scopeKey = `${session.user?.id ?? 'unknown'}:${session.organization.id}`
      selectionScopeRef.current = scopeKey

      // Load CRM connections
      void loadConnectedCrms(epoch)

      // Get current tab's LinkedIn profile from background
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!isStateEpochCurrent(epoch)) {
        return
      }
      await syncSelectionScope(scopeKey, tab?.id, epoch)
      if (!isStateEpochCurrent(epoch)) {
        return
      }

      if (!tab?.id) {
        activeLinkedInTabIdRef.current = null
        setLead(null)
        setCrmPresence([])
        setJustAdded(false)
        setState({ phase: 'ready', session, profile: null })
        setActiveTab('leads')
        void loadContext(session.organization.id, epoch)
        return
      }
      activeLinkedInTabIdRef.current = tab.id

      // Request profile from content script
      const profile = await new Promise<LinkedInProfile | null>((resolve) => {
        chrome.tabs.sendMessage(
          tab.id!,
          { type: 'GET_PROFILE' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                '[OmniDial] Error getting profile from content script:',
                chrome.runtime.lastError.message,
              )
              resolve(null)
            } else {
              console.log(
                '[OmniDial] Profile received from content script:',
                response,
              )
              resolve(response)
            }
          },
        )
      })
      if (!isStateEpochCurrent(epoch)) {
        return
      }

      if (!profile) {
        console.log('[OmniDial] No profile detected - showing leads view')
        setLead(null)
        setCrmPresence([])
        setJustAdded(false)
        setState({ phase: 'ready', session, profile: null })
        setActiveTab('leads')
        void loadContext(session.organization.id, epoch)
        return
      }

      // Validate the profile has a URL
      if (!profile.profileUrl) {
        console.warn('[OmniDial] Profile detected but no profileUrl:', profile)
      }

      setState({ phase: 'ready', session, profile })

      // Load context and check lead in parallel
      setLead(null)
      setCrmPresence([])
      setJustAdded(false)
      void loadContextAndLead(session.organization.id, profile.profileUrl, epoch)
    } catch (err) {
      if (!isStateEpochCurrent(epoch)) {
        return
      }
      if (err instanceof ExtensionContextError || !isExtensionContextValid()) {
        setContextDead(true)
        return
      }
      console.error('Initialization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize')
      setState({ phase: 'not_authenticated' })
    }
  }

  async function syncSelectionScope(
    scopeKey: string,
    tabId?: number,
    epoch?: number,
  ) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SET_SELECTION_SCOPE',
        tabId,
        data: { scopeKey },
      })
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      if (typeof response?.count === 'number') {
        setSelectionCount(response.count)
      }
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'REFRESH_SELECTION_UI' }, () => {
          // Ignore missing content script errors on non-LinkedIn tabs.
          void chrome.runtime.lastError
        })
      }
    } catch (err) {
      console.error('Failed to sync selection scope:', err)
    }
  }

  async function loadConnectedCrms(epoch?: number) {
    try {
      const crms = await api.getConnectedCrms()
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      setConnectedCrms(crms)
    } catch (err) {
      console.error('Failed to load connected CRMs:', err)
    }
  }

  async function loadCrmPresence(leadId: string, epoch?: number) {
    try {
      const presence = await api.getCrmPresence(leadId)
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      setCrmPresence(presence)
    } catch (err) {
      console.error('Failed to load CRM presence:', err)
    }
  }

  async function loadContext(orgId: string, epoch?: number) {
    try {
      let ctx = await getCachedQuickContext(orgId)
      if (!ctx) {
        ctx = await api.getQuickContext()
        await setCachedQuickContext(orgId, ctx)
      }
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      setContext(ctx)
    } catch (err) {
      console.error('Failed to load context:', err)
    }
  }

  async function loadContextAndLead(
    orgId: string,
    linkedInUrl: string,
    epoch?: number,
  ) {
    try {
      // Load quick context (clients, campaigns, phone numbers)
      let ctx = await getCachedQuickContext(orgId)
      if (!ctx) {
        ctx = await api.getQuickContext()
        await setCachedQuickContext(orgId, ctx)
      }
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      setContext(ctx)

      // Check if lead exists
      let leadResult = await getCachedLeadLookup(orgId, linkedInUrl)
      if (!leadResult) {
        leadResult = await api.checkLead(linkedInUrl)
        await setCachedLeadLookup(orgId, linkedInUrl, leadResult)
      }
      if (epoch && !isStateEpochCurrent(epoch)) {
        return
      }
      setLead(leadResult)

      // Load CRM presence if lead exists
      if (leadResult.exists && leadResult.lead?.id) {
        void loadCrmPresence(leadResult.lead.id, epoch)
      } else if (!epoch || isStateEpochCurrent(epoch)) {
        setCrmPresence([])
      }
    } catch (err) {
      console.error('Failed to load context:', err)
    }
  }

  async function handleEnrich() {
    if (state.phase !== 'ready') return

    const orgId = state.session.organization!.id

    // If lead already exists with phone and a CRM is selected, just push to CRM
    if (lead?.exists && lead.lead?.phone && selectedCrm) {
      setIsEnriching(true)
      setError(null)
      try {
        await api.pushToCrm(lead.lead.id, selectedCrm)
        // Refresh CRM presence
        loadCrmPresence(lead.lead.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to push to CRM')
      } finally {
        setIsEnriching(false)
      }
      return
    }

    if (!state.profile) {
      setError(
        'Open a LinkedIn profile to enrich this lead, or select a CRM to push an existing lead.',
      )
      return
    }

    setIsEnriching(true)
    setError(null)

    // Debug: Log what we're sending to the API
    console.log('[OmniDial] Enriching profile:', {
      profileUrl: state.profile.profileUrl,
      firstName: state.profile.firstName,
      lastName: state.profile.lastName,
      company: state.profile.company,
      fullName: state.profile.fullName,
    })

    // Validate we have a profile URL
    if (!state.profile.profileUrl) {
      setError(
        'No LinkedIn profile URL detected. Please refresh the LinkedIn page.',
      )
      setIsEnriching(false)
      return
    }

    try {
      const result = await api.enrichLead({
        linkedInUrl: state.profile.profileUrl,
        firstName: state.profile.firstName,
        lastName: state.profile.lastName,
        company: state.profile.company,
        headline: state.profile.headline,
        location: state.profile.location,
      })

      console.log('[OmniDial] Enrich result:', result)

      // Refresh lead data from server
      const updatedLead = await api.checkLead(state.profile.profileUrl)
      await setCachedLeadLookup(orgId, state.profile.profileUrl, updatedLead)
      setLead(updatedLead)
      setJustAdded(true)

      // Update profile state if Prospeo returned profile data
      if (result.firstName || result.lastName) {
        setState({
          ...state,
          profile: {
            ...state.profile,
            firstName: result.firstName || state.profile.firstName,
            lastName: result.lastName || state.profile.lastName,
            fullName:
              [result.firstName, result.lastName].filter(Boolean).join(' ') ||
              state.profile.fullName,
            company: result.company || state.profile.company,
            headline: result.title || state.profile.headline,
          },
        })
      }

      // Push to CRM if one is selected and we have a lead ID
      if (selectedCrm && updatedLead.lead?.id) {
        try {
          await api.pushToCrm(updatedLead.lead.id, selectedCrm)
          loadCrmPresence(updatedLead.lead.id)
        } catch (crmErr) {
          console.error('CRM push failed:', crmErr)
          // Don't overwrite the main error, just log it
        }
      }

      // Load CRM presence for newly enriched lead
      if (updatedLead.lead?.id) {
        loadCrmPresence(updatedLead.lead.id)
      }

      // Show info/warning message if there was an issue during enrichment
      // but the lead was still created
      if (result.errorMessage) {
        setError(result.errorMessage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    } finally {
      setIsEnriching(false)
    }
  }

  function handleSelectDatabaseLead(dbLead: LeadListItemType) {
    setSelectedDatabaseLead(dbLead)
    setActiveTab('enrich')

    if (state.phase === 'ready') {
      loadCrmPresence(dbLead.id)
    }

    setLead({
      exists: true,
      lead: {
        id: dbLead.id,
        firstName: dbLead.firstName ?? '',
        lastName: dbLead.lastName ?? '',
        company: dbLead.company,
        phone: dbLead.phone,
        linkedInUrl: dbLead.linkedInUrl,
        campaign:
          dbLead.campaignId && dbLead.campaignName
            ? { id: dbLead.campaignId, name: dbLead.campaignName }
            : undefined,
        client:
          dbLead.clientId && dbLead.clientName
            ? { id: dbLead.clientId, name: dbLead.clientName }
            : undefined,
      },
      matchedBy: 'linkedInUrl',
    })
  }

  // Render based on state
  if (contextDead) {
    return (
      <div className="loading-screen">
        <AlertTriangle
          size={48}
          style={{ color: 'var(--destructive, #ef4444)' }}
        />
        <p className="loading-text" style={{ fontWeight: 600, marginTop: 16 }}>
          Extension Disconnected
        </p>
        <p
          className="loading-text"
          style={{
            fontSize: 13,
            opacity: 0.7,
            maxWidth: 260,
            textAlign: 'center',
          }}
        >
          The extension context was invalidated. Close this panel, reload the
          extension from chrome://extensions, and reopen.
        </p>
      </div>
    )
  }

  if (state.phase === 'loading') {
    return (
      <div className="loading-screen">
        <Logo3DSpinner size={80} />
        <p className="loading-text">Loading...</p>
      </div>
    )
  }

  if (state.phase === 'not_authenticated') {
    return <AuthGate error={error} />
  }

  // At this point, state is 'ready'
  const { session, profile } = state
  const hasProfile = !!profile
  const hasPhone = !!(
    lead?.exists &&
    (lead.lead?.phoneNumbers?.length || lead.lead?.phone)
  )

  return (
    <div className="app-layout">
      <header className="header">
        <div className="header-title">
          <LogoIcon size={20} />
          <span className="header-brand">Enrich</span>
          <span
            className={`status-indicator ${session.authenticated ? 'connected' : 'disconnected'}`}
          />
        </div>
      </header>

      <div className="app-content">
        {activeTab === 'enrich' && (
          <>
            {!hasProfile && !lead?.exists && (
              <div className="empty-content">
                <Link className="empty-icon" />
                <h2 className="empty-title">No LinkedIn Profile</h2>
                <p className="empty-text">
                  Navigate to a LinkedIn profile to detect prospects, or browse
                  your existing leads
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('leads')}
                >
                  <Users size={18} />
                  Browse Leads
                </button>
              </div>
            )}

            {hasProfile && profile && (
              <>
                <LeadPanel
                  profile={profile}
                  lead={lead}
                  justAdded={justAdded}
                />
                {lead?.exists && (
                  <CrmBadges presence={crmPresence} inGtm={lead.exists} />
                )}
              </>
            )}

            {!hasProfile && lead?.exists && lead.lead && (
              <div className="lead-panel">
                <h2 className="lead-name">
                  {[lead.lead.firstName, lead.lead.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Unknown'}
                </h2>
                {lead.lead.company && (
                  <p className="lead-headline">{lead.lead.company}</p>
                )}
                {lead.lead.phone && (
                  <p className="lead-location">
                    <Phone size={14} />
                    <span className="phone-number">{lead.lead.phone}</span>
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="error-panel">
                <div className="error-header">
                  <AlertTriangle size={16} />
                  <span>Enrichment Issue</span>
                </div>
                <div className="error-message">{error}</div>
                {lead?.exists && !lead.lead?.phone && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={handleEnrich}
                    disabled={isEnriching}
                  >
                    {isEnriching ? 'Retrying...' : 'Retry Enrichment'}
                  </button>
                )}
              </div>
            )}

            {/* CRM Selector */}
            {(hasProfile || lead?.exists) && (
              <CrmSelector
                connectedCrms={connectedCrms}
                selectedProvider={selectedCrm}
                onSelect={setSelectedCrm}
              />
            )}

            {/* Show enrich/push button for new leads OR existing leads without phone OR push to CRM */}
            {(hasProfile ||
              (!!lead?.exists && !!lead.lead?.phone && !!selectedCrm)) && (
              <EnrichAndPushButton
                onEnrich={handleEnrich}
                isLoading={isEnriching}
                isExistingLead={!!lead?.exists}
                hasPhone={hasPhone}
                selectedCrm={selectedCrm}
              />
            )}

            {lead?.exists && lead.lead && context && (
              <AddToCampaignButton
                leadId={lead.lead.id}
                linkedInUrl={lead.lead.linkedInUrl}
                organizationId={session.organization!.id}
                campaigns={context.campaigns}
                currentCampaignId={lead.lead.campaign?.id}
                onSuccess={(campaignId, campaignName) => {
                  // Update lead state to reflect campaign assignment
                  setLead({
                    ...lead,
                    lead: {
                      ...lead.lead!,
                      campaign: { id: campaignId, name: campaignName },
                    },
                  })
                }}
              />
            )}
          </>
        )}

        {activeTab === 'leads' && session.organization && (
          <LeadBrowser
            context={context}
            organizationId={session.organization.id}
            selectedLeadId={selectedDatabaseLead?.id}
            onSelectLead={handleSelectDatabaseLead}
          />
        )}

        {activeTab === 'cart' && session.organization && session.user && (
          <LinkedInSelectionCart
            organizationId={session.organization.id}
            userId={session.user.id}
            connectedCrms={connectedCrms}
          />
        )}

        {activeTab === 'vendors' && session.organization && (
          <VendorSettings organizationId={session.organization.id} />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            userEmail={session.user?.email}
            organizationName={session.organization?.name ?? undefined}
            organizationId={session.organization?.id ?? undefined}
          />
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={selectionCount}
      />
    </div>
  )
}
