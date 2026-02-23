import { MapPin, Check, Circle, UserCheck, CheckCircle } from 'lucide-react'
import type { LinkedInProfile, CheckLeadResponse } from '../../types'

interface LeadPanelProps {
  profile: LinkedInProfile
  lead: CheckLeadResponse | null
  justAdded?: boolean
}

export function LeadPanel({ profile, lead, justAdded }: LeadPanelProps) {
  const isExisting = lead?.exists && lead.lead
  const phone = lead?.lead?.phone
  const phoneCount = lead?.lead?.phoneNumbers?.length ?? 0
  const extraPhones = phoneCount > 1 ? phoneCount - 1 : 0

  // Prefer lead data from CRM when available, fallback to parsed profile
  const displayName = isExisting
    ? [lead.lead?.firstName, lead.lead?.lastName].filter(Boolean).join(' ') || profile.fullName || 'Unknown'
    : profile.fullName || 'Unknown'

  const displayHeadline = profile.headline || (isExisting ? lead.lead?.company : undefined)

  return (
    <div className="lead-panel">
      <h2 className="lead-name">{displayName}</h2>
      {displayHeadline && (
        <p className="lead-headline">{displayHeadline}</p>
      )}
      {profile.location && (
        <p className="lead-location">
          <MapPin />
          {profile.location}
        </p>
      )}

      <div className="lead-status">
        <div className="status-row">
          <span className="status-icon success">
            <Check />
          </span>
          <span>LinkedIn detected</span>
        </div>
        <div className="status-row">
          <span className={`status-icon ${phone ? 'success' : 'pending'}`}>
            {phone ? <Check /> : <Circle />}
          </span>
          <span>
            Phone: {phone ? (
              <>
                <span className="phone-number">{phone}</span>
                {extraPhones > 0 && <span className="phone-extra-count"> (+{extraPhones} more)</span>}
              </>
            ) : 'Not enriched'}
          </span>
        </div>
      </div>

      {isExisting && justAdded && (
        <div className="existing-badge added">
          <CheckCircle size={14} />
          Lead Added
          {lead.lead?.campaign && (
            <span> · {lead.lead.campaign.name}</span>
          )}
        </div>
      )}
      {isExisting && !justAdded && (
        <div className="existing-badge">
          <UserCheck size={14} />
          Already in CRM
          {lead.lead?.campaign && (
            <span> · {lead.lead.campaign.name}</span>
          )}
        </div>
      )}
    </div>
  )
}
