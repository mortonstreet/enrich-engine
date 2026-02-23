import type { CrmPresenceItem } from '../../types'

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  omnidial: { label: 'OD', color: '#10B981' },
  hubspot: { label: 'HS', color: '#FF7A59' },
  salesforce: { label: 'SF', color: '#00A1E0' },
  attio: { label: 'AT', color: '#6C5CE7' },
  pipedrive: { label: 'PD', color: '#017737' },
  monday: { label: 'MO', color: '#FF3D57' },
}

interface CrmBadgesProps {
  presence: CrmPresenceItem[]
  inGtm: boolean
}

export function CrmBadges({ presence, inGtm }: CrmBadgesProps) {
  const badges: { label: string; color: string; active: boolean }[] = [
    { ...BADGE_CONFIG.omnidial, active: inGtm },
    ...presence.map((p) => ({
      ...(BADGE_CONFIG[p.provider] || { label: p.provider.slice(0, 2).toUpperCase(), color: '#71717a' }),
      active: p.exists,
    })),
  ]

  const activeBadges = badges.filter(b => b.active)
  if (activeBadges.length === 0) return null

  return (
    <div className="crm-badges">
      {activeBadges.map((badge) => (
        <span
          key={badge.label}
          className="crm-badge"
          style={{ backgroundColor: `${badge.color}20`, color: badge.color, borderColor: `${badge.color}40` }}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}
