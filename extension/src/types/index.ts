export interface LinkedInProfile {
  profileUrl: string
  fullName: string
  firstName?: string
  lastName?: string
  headline?: string
  company?: string
  location?: string
}

export interface SessionResponse {
  authenticated: boolean
  user: {
    id: string
    name: string
    email: string
  } | null
  organization: {
    id: string
    name: string
  } | null
}

export interface EnrichedPhoneNumber {
  value: string
  type: 'mobile' | 'direct_dial' | 'office'
  source: string
  isPrimary: boolean
}

export interface CheckLeadResponse {
  exists: boolean
  lead?: {
    id: string
    firstName: string
    lastName: string
    company: string | null
    phone: string | null
    linkedInUrl: string | null
    phoneNumbers?: Array<{
      id: string
      value: string
      type: string
      source: string | null
      isPrimary: boolean
    }>
    campaign?: { id: string; name: string }
    client?: { id: string; name: string }
  }
  matchedBy: 'linkedInUrl' | 'phone' | null
}

export interface QuickContextResponse {
  clients: Array<{ id: string; name: string; color: string | null }>
  campaigns: Array<{
    id: string
    name: string
    clientId: string
    leadCount: number
  }>
  phoneNumbers: Array<{ id: string; number: string; clientId: string }>
}

export interface EnrichRequest {
  linkedInUrl: string
  firstName?: string
  lastName?: string
  company?: string
  headline?: string
  location?: string
}

export interface EnrichResponse {
  leadId: string | null
  phone?: string | null
  email?: string | null
  phoneNumbers?: EnrichedPhoneNumber[]
  // Profile data (returned from Prospeo when DOM parsing fails)
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  title?: string | null
  enrichedBy: string[]
  success: boolean
  errorMessage?: string
}

export interface LeadListItem {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  phone: string | null
  email: string | null
  linkedInUrl: string | null
  isEnriched: boolean
  clientId: string | null
  clientName: string | null
  campaignId: string | null
  campaignName: string | null
}

export interface GetLeadsParams {
  clientId?: string
  campaignId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface GetLeadsResponse {
  leads: LeadListItem[]
  total: number
  hasMore: boolean
}

export interface AddToCampaignResponse {
  added: number
  alreadyInCampaign: number
}

export type ExtensionState =
  | { status: 'not_linkedin' }
  | { status: 'checking_auth' }
  | { status: 'not_authenticated' }
  | { status: 'loading_profile' }
  | { status: 'profile_detected'; profile: LinkedInProfile }
  | { status: 'checking_lead'; profile: LinkedInProfile }
  | {
      status: 'existing_lead'
      profile: LinkedInProfile
      lead: CheckLeadResponse['lead']
    }
  | { status: 'new_lead'; profile: LinkedInProfile }
  | { status: 'enriching'; profile: LinkedInProfile }
  | {
      status: 'enriched'
      profile: LinkedInProfile
      lead: CheckLeadResponse['lead']
    }
  | { status: 'error'; message: string }

export interface MessageToBackground {
  type:
    | 'PROFILE_DETECTED'
    | 'GET_STATE'
    | 'CHECK_SESSION'
    | 'TAB_CHANGED'
    | 'SELECTION_TOGGLE'
    | 'GET_SELECTION_CART'
    | 'GET_SELECTION_STATUS'
    | 'SET_SELECTION_SCOPE'
    | 'CLEAR_SELECTION_SCOPE'
    | 'CLEAR_SELECTION_CART'
    | 'REMOVE_SELECTION'
  data?: unknown
  tabId?: number
}

export interface MessageFromBackground {
  type: 'STATE_UPDATE' | 'PROFILE_DETECTED' | 'SELECTION_CART_UPDATED'
  state?: ExtensionState
  profile?: LinkedInProfile
  data?: unknown
  tabId?: number
}

// CRM types
export interface CrmConnectionItem {
  provider: string
  connectedAt?: string
}

export interface CrmPresenceItem {
  provider: string
  exists: boolean
  externalId: string | null
  externalUrl: string | null
  syncStatus: string | null
}

export interface CrmPushResult {
  success: boolean
  externalId: string
  externalUrl?: string
}

// Vendor types
export interface VendorConnection {
  id: string
  provider: string
  providerName: string
  isActive: boolean
  creditsUsed: number
  creditsLimit: number | null
  lastSyncAt: string | null
}

export type LinkedInSelectionSourceType =
  | 'linkedin_search'
  | 'linkedin_recommended'
  | 'sales_nav_search'

export interface LinkedInSelectionItem {
  canonicalLinkedInUrl: string
  rawLinkedInUrl: string
  fullName?: string
  firstName?: string
  lastName?: string
  headline?: string
  company?: string
  location?: string
  sourcePageUrl: string
  sourceType: LinkedInSelectionSourceType
  capturedAt: string
}

export interface CreateListFromLinkedInSelectionRequest {
  listName: string
  listDescription?: string
  selections: LinkedInSelectionItem[]
}

export interface CreateListFromLinkedInSelectionResponse {
  listId: string
  listName: string
  totalSelected: number
  createdLeads: number
  dedupedExistingLeads: number
  leadIds: string[]
  correlationId: string
}

export interface QueueBulkListEnrichResponse {
  jobId: string
  listId: string
  totalLeads: number
  correlationId: string
}

export interface BulkEnrichJobStatusResponse {
  jobId: string
  correlationId: string
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused'
  progress:
    | number
    | {
        processed: number
        total: number
        enriched: number
        failed: number
      }
  result?: {
    totalRequested: number
    totalEnriched: number
    totalFailed: number
    totalCreditsUsed: number
  }
  errorMessage?: string
}

export interface BulkCrmPushResponse {
  provider: string
  totalRequested: number
  totalPushed: number
  totalFailed: number
  correlationId: string
  results: Array<{
    leadId: string
    success: boolean
    externalId?: string
    externalUrl?: string
    errorMessage?: string
  }>
}
