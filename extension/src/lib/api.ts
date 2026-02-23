import type {
  SessionResponse,
  CheckLeadResponse,
  QuickContextResponse,
  EnrichRequest,
  EnrichResponse,
  GetLeadsParams,
  GetLeadsResponse,
  AddToCampaignResponse,
  CrmConnectionItem,
  CrmPresenceItem,
  CrmPushResult,
  VendorConnection,
  CreateListFromLinkedInSelectionRequest,
  CreateListFromLinkedInSelectionResponse,
  QueueBulkListEnrichResponse,
  BulkEnrichJobStatusResponse,
  BulkCrmPushResponse,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.omnidial.io'

export class ExtensionContextError extends Error {
  constructor() {
    super('Extension context invalidated. Please reload the extension.')
    this.name = 'ExtensionContextError'
  }
}

/** Returns true if the extension context is still alive */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    if (!isExtensionContextValid()) {
      throw new ExtensionContextError()
    }

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      credentials: 'include', // Include session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorBody}`)
    }

    if (
      response.status === 204 ||
      response.headers.get('content-length') === '0'
    ) {
      return undefined as T
    }

    return response.json()
  }

  async getSession(): Promise<SessionResponse> {
    return this.fetch<SessionResponse>('/api/extension/session')
  }

  async checkLead(
    linkedInUrl: string,
  ): Promise<CheckLeadResponse> {
    const params = new URLSearchParams({
      linkedInUrl,
    })
    return this.fetch<CheckLeadResponse>(`/api/extension/check-lead?${params}`)
  }

  async getQuickContext(): Promise<QuickContextResponse> {
    return this.fetch<QuickContextResponse>('/api/extension/quick-context')
  }

  async enrichLead(data: EnrichRequest): Promise<EnrichResponse> {
    return this.fetch<EnrichResponse>('/api/extension/enrich', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async addToCampaign(params: {
    leadIds: string[]
    campaignId: string
    organizationId: string
  }): Promise<AddToCampaignResponse> {
    return this.fetch<AddToCampaignResponse>(
      '/api/leads/bulk-add-to-campaign',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
  }

  async getLeads(params: GetLeadsParams): Promise<GetLeadsResponse> {
    const searchParams = new URLSearchParams()
    if (params.clientId) searchParams.set('clientId', params.clientId)
    if (params.campaignId) searchParams.set('campaignId', params.campaignId)
    if (params.search) searchParams.set('search', params.search)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    return this.fetch<GetLeadsResponse>(`/api/extension/leads?${searchParams}`)
  }

  // CRM operations
  async getConnectedCrms(): Promise<CrmConnectionItem[]> {
    const response = await this.fetch<{ data: CrmConnectionItem[] }>(
      '/api/extension/connected-crms',
    )
    return response.data
  }

  async getCrmPresence(leadId: string): Promise<CrmPresenceItem[]> {
    const params = new URLSearchParams({ leadId })
    const response = await this.fetch<{ data: CrmPresenceItem[] }>(
      `/api/extension/crm-presence?${params}`,
    )
    return response.data
  }

  async pushToCrm(
    leadId: string,
    provider: string,
  ): Promise<CrmPushResult> {
    const response = await this.fetch<{ data: CrmPushResult }>(
      '/api/extension/push-to-crm',
      {
        method: 'POST',
        body: JSON.stringify({ leadId, provider }),
      },
    )
    return response.data
  }

  // Enrichment vendor operations
  async getVendors(_organizationId?: string): Promise<VendorConnection[]> {
    const response = await this.fetch<{ data: VendorConnection[] }>(
      '/api/enrichment/vendors',
    )
    return response.data
  }

  async connectVendor(data: {
    provider: string
    apiKey: string
  }): Promise<VendorConnection> {
    return this.fetch<VendorConnection>('/api/enrichment/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateVendor(
    vendorId: string,
    _organizationId: string,
    data: { isActive?: boolean },
  ): Promise<void> {
    await this.fetch(`/api/enrichment/vendors/${vendorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async disconnectVendor(
    vendorId: string,
    _organizationId: string,
  ): Promise<void> {
    await this.fetch(`/api/enrichment/vendors/${vendorId}`, {
      method: 'DELETE',
    })
  }

  async testVendor(
    vendorId: string,
    _organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.fetch<{ success: boolean; message: string }>(
      `/api/enrichment/vendors/${vendorId}/test`,
      { method: 'POST' },
    )
  }

  // Integration management (for CRM disconnect)
  async disconnectIntegration(
    provider: string,
    organizationId: string,
  ): Promise<void> {
    await this.fetch(
      `/api/integrations/${provider}?organizationId=${organizationId}`,
      {
        method: 'DELETE',
      },
    )
  }

  async createListFromLinkedInSelection(
    data: CreateListFromLinkedInSelectionRequest,
  ): Promise<CreateListFromLinkedInSelectionResponse> {
    return this.fetch<CreateListFromLinkedInSelectionResponse>(
      '/api/extension/lists/create-from-linkedin-selection',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  }

  async bulkEnrichList(
    listId: string,
    options?: {
      providers?: string[]
      forceRefresh?: boolean
    },
  ): Promise<QueueBulkListEnrichResponse> {
    return this.fetch<QueueBulkListEnrichResponse>(
      `/api/extension/lists/${listId}/bulk-enrich`,
      {
        method: 'POST',
        body: JSON.stringify(options ?? {}),
      },
    )
  }

  async getBulkJobStatus(jobId: string): Promise<BulkEnrichJobStatusResponse> {
    return this.fetch<BulkEnrichJobStatusResponse>(`/api/extension/jobs/${jobId}`)
  }

  async bulkPushListToCrm(
    listId: string,
    provider: string,
  ): Promise<BulkCrmPushResponse> {
    return this.fetch<BulkCrmPushResponse>(
      `/api/extension/lists/${listId}/bulk-push-crm`,
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      },
    )
  }
}

export const api = new ApiClient(API_BASE_URL)
