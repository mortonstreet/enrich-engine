import type { CrmConnectionItem } from '../../types'

interface CrmSelectorProps {
  connectedCrms: CrmConnectionItem[]
  selectedProvider: string | null
  onSelect: (provider: string) => void
}

export function CrmSelector({ connectedCrms, selectedProvider, onSelect }: CrmSelectorProps) {
  if (connectedCrms.length === 0) {
    return null
  }

  return (
    <div className="crm-selector">
      <label className="selector-label">Push to CRM</label>
      <select
        className="selector"
        value={selectedProvider || ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Select CRM...</option>
        {connectedCrms.map((crm) => (
          <option key={crm.provider} value={crm.provider}>
            {crm.provider === 'hubspot'
              ? 'HubSpot'
              : crm.provider === 'salesforce'
                ? 'Salesforce'
                : crm.provider === 'attio'
                  ? 'Attio'
                  : crm.provider === 'pipedrive'
                    ? 'Pipedrive'
                    : crm.provider}
          </option>
        ))}
      </select>
    </div>
  )
}
