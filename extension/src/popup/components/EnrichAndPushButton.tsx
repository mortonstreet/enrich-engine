import { Search, RefreshCw, ArrowRight } from 'lucide-react'

interface EnrichAndPushButtonProps {
  onEnrich: () => void
  isLoading: boolean
  isExistingLead: boolean
  hasPhone: boolean
  selectedCrm: string | null
}

export function EnrichAndPushButton({ onEnrich, isLoading, isExistingLead, hasPhone, selectedCrm }: EnrichAndPushButtonProps) {
  const getCrmLabel = (provider: string | null) => {
    if (!provider) return ''
    switch (provider) {
      case 'hubspot': return 'HubSpot'
      case 'salesforce': return 'Salesforce'
      case 'attio': return 'Attio'
      default: return provider
    }
  }

  let label = 'Enrich & Add Lead'
  let variant = 'btn-primary'

  if (isExistingLead && hasPhone && selectedCrm) {
    label = `Push to ${getCrmLabel(selectedCrm)}`
    variant = 'btn-secondary'
  } else if (isExistingLead && !hasPhone) {
    label = 'Enrich for Phone'
    variant = 'btn-secondary'
  } else if (selectedCrm) {
    label = `Enrich & Add to ${getCrmLabel(selectedCrm)}`
  }

  return (
    <button
      className={`btn ${variant}`}
      onClick={onEnrich}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className="loading-spinner" />
          Processing...
        </>
      ) : (
        <>
          {isExistingLead && hasPhone && selectedCrm ? <ArrowRight size={18} /> : isExistingLead ? <RefreshCw size={16} /> : <Search size={18} />}
          {label}
        </>
      )}
    </button>
  )
}
