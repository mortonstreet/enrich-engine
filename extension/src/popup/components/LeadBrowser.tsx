import { useState } from 'react'
import { Search, Users, Loader2, Sparkles, ListPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { clearCachedQuickContext } from '../../lib/storage'
import type {
  QuickContextResponse,
  LeadListItem as LeadListItemType,
} from '../../types'

interface LeadBrowserProps {
  context: QuickContextResponse | null
  organizationId: string
  selectedLeadId?: string
  onSelectLead: (lead: LeadListItemType) => void
  onAddToCampaign?: (
    lead: LeadListItemType,
    campaignId: string,
    campaignName: string,
  ) => void
}

export function LeadBrowser({
  context,
  organizationId,
  selectedLeadId,
  onSelectLead,
  onAddToCampaign,
}: LeadBrowserProps) {
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState<LeadListItemType[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [addingLeadId, setAddingLeadId] = useState<string | null>(null)
  const [showCampaignPicker, setShowCampaignPicker] = useState<string | null>(
    null,
  )
  const LIMIT = 20

  const handleAddToCampaign = async (
    lead: LeadListItemType,
    campaignId: string,
  ) => {
    setAddingLeadId(lead.id)
    try {
      const result = await api.addToCampaign({
        leadIds: [lead.id],
        campaignId,
        organizationId,
      })
      if (result.added > 0) {
        const campaign = context?.campaigns.find((c) => c.id === campaignId)
        // Update lead in local state
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, campaignId, campaignName: campaign?.name || null }
              : l,
          ),
        )
        await clearCachedQuickContext(organizationId)
        onAddToCampaign?.(lead, campaignId, campaign?.name || '')
      }
    } catch (err) {
      console.error('Failed to add to campaign:', err)
    } finally {
      setAddingLeadId(null)
      setShowCampaignPicker(null)
    }
  }

  // Quick search suggestions
  const quickSearches = [
    { label: 'Recent leads', query: '' },
    { label: 'Needs phone', query: 'needs:phone' },
    { label: 'Has phone', query: 'has:phone' },
  ]

  const fetchLeads = async (searchQuery: string, reset = true) => {
    setIsLoading(true)
    setHasSearched(true)
    setError(null)

    try {
      const newOffset = reset ? 0 : offset

      // Parse special queries
      let actualSearch = searchQuery
      let clientId: string | undefined
      let campaignId: string | undefined

      // For now, just do a simple search
      // Future: parse "needs:phone", "has:phone", "client:name", etc.

      console.log('Fetching leads with:', {
        search: actualSearch,
      })

      const result = await api.getLeads({
        clientId,
        campaignId,
        search: actualSearch || undefined,
        limit: LIMIT,
        offset: newOffset,
      })

      console.log('Got leads result:', result)

      if (reset) {
        setLeads(result.leads)
        setOffset(LIMIT)
      } else {
        setLeads((prev) => [...prev, ...result.leads])
        setOffset((prev) => prev + LIMIT)
      }
      setTotal(result.total)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to search leads')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLeads(search, true)
  }

  const handleQuickSearch = (query: string) => {
    setSearch(query)
    fetchLeads(query, true)
  }

  const getInitials = (lead: LeadListItemType) => {
    const first = lead.firstName?.[0] || ''
    const last = lead.lastName?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }

  const getName = (lead: LeadListItemType) => {
    return (
      [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'
    )
  }

  return (
    <div className="lead-browser">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-wrapper">
          <div className="search-icon">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="search-input"
            placeholder="Search leads by name, company, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-search"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={18} className="spinning" />
          ) : (
            <Search size={18} />
          )}
        </button>
      </form>

      {/* Quick Actions */}
      {!hasSearched && (
        <div className="quick-actions">
          <p className="quick-actions-label">Quick searches</p>
          <div className="quick-actions-grid">
            {quickSearches.map((item) => (
              <button
                key={item.label}
                className="quick-action-btn"
                onClick={() => handleQuickSearch(item.query)}
              >
                <Sparkles size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-message">{error}</div>}

      {/* Results */}
      {hasSearched && !error && (
        <>
          {isLoading && leads.length === 0 ? (
            <div className="browser-loading">
              <Loader2 size={24} className="spinning" />
              <p>Searching leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="browser-empty">
              <Users size={32} />
              <p>No leads found</p>
              <span>Try a different search term</span>
            </div>
          ) : (
            <>
              <div className="results-header">
                <span className="results-count">
                  {total} lead{total !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="leads-scroll">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`lead-row ${lead.id === selectedLeadId ? 'selected' : ''}`}
                    onClick={() => onSelectLead(lead)}
                  >
                    <div className="lead-row-avatar">{getInitials(lead)}</div>
                    <div className="lead-row-info">
                      <div className="lead-row-top">
                        <span className="lead-row-name">{getName(lead)}</span>
                        {lead.campaignName && (
                          <span
                            className="badge-campaign"
                            title={lead.campaignName}
                          >
                            {lead.campaignName}
                          </span>
                        )}
                      </div>
                      {lead.company && (
                        <div className="lead-row-company">{lead.company}</div>
                      )}
                    </div>
                    <div className="lead-row-actions">
                      {!lead.campaignName &&
                        context?.campaigns &&
                        context.campaigns.length > 0 &&
                        (showCampaignPicker === lead.id ? (
                          <select
                            className="selector"
                            style={{
                              width: 100,
                              fontSize: 11,
                              padding: '2px 4px',
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              if (e.target.value) {
                                handleAddToCampaign(lead, e.target.value)
                              }
                            }}
                            onBlur={() => setShowCampaignPicker(null)}
                            disabled={addingLeadId === lead.id}
                          >
                            <option value="">Campaign...</option>
                            {context.campaigns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            className="btn-icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowCampaignPicker(lead.id)
                            }}
                            title="Add to campaign"
                            disabled={addingLeadId === lead.id}
                          >
                            {addingLeadId === lead.id ? (
                              <Loader2 size={14} className="spinning" />
                            ) : (
                              <ListPlus size={14} />
                            )}
                          </button>
                        ))}
                      <span className="badge-no-phone">
                        {lead.phone ? 'Has phone' : 'No phone'}
                      </span>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <button
                    className="load-more-btn"
                    onClick={() => fetchLeads(search, false)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
