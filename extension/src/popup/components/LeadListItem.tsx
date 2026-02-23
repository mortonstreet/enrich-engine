import { Phone } from 'lucide-react'
import type { LeadListItem as LeadListItemType } from '../../types'

interface LeadListItemProps {
  lead: LeadListItemType
  isSelected: boolean
  onClick: () => void
  onCall?: () => void
}

export function LeadListItem({ lead, isSelected, onClick, onCall }: LeadListItemProps) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'
  const initials = (lead.firstName?.[0] || '') + (lead.lastName?.[0] || '')

  return (
    <div
      className={`lead-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="lead-avatar">
        {initials.toUpperCase() || '?'}
      </div>
      <div className="lead-info">
        <div className="lead-info-name">{name}</div>
        {lead.company && (
          <div className="lead-info-company">{lead.company}</div>
        )}
        {lead.phone && (
          <div className="lead-info-phone">{lead.phone}</div>
        )}
      </div>
      <div className="lead-actions">
        {lead.isEnriched ? (
          <span className="enriched-badge">Enriched</span>
        ) : (
          <span className="needs-enrichment-badge">Needs Data</span>
        )}
        {lead.phone && onCall && (
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onCall()
            }}
            title="Call"
          >
            <Phone size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
