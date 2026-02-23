import { useState } from 'react'
import { ListPlus, Loader2, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { clearCachedQuickContext, clearCachedLeadLookup } from '../../lib/storage'
import type { QuickContextResponse } from '../../types'

interface AddToCampaignButtonProps {
  leadId: string
  linkedInUrl?: string | null
  organizationId: string
  campaigns: QuickContextResponse['campaigns']
  currentCampaignId?: string | null
  onSuccess?: (campaignId: string, campaignName: string) => void
}

export function AddToCampaignButton({
  leadId,
  linkedInUrl,
  organizationId,
  campaigns,
  currentCampaignId,
  onSuccess,
}: AddToCampaignButtonProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (currentCampaignId) {
    const campaign = campaigns.find((c) => c.id === currentCampaignId)
    return (
      <div className="selector-group">
        <div className="selector-item">
          <span className="selector-label">
            <ListPlus size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Campaign
          </span>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '6px 0' }}>
            <Check size={14} style={{ display: 'inline', marginRight: 4, color: 'var(--primary)', verticalAlign: 'middle' }} />
            {campaign?.name || 'Assigned'}
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="selector-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: 'var(--primary)' }}>
          <Check size={16} />
          Added to campaign
        </div>
      </div>
    )
  }

  const handleAdd = async () => {
    if (!selectedCampaignId) return

    setIsAdding(true)
    setError(null)

    try {
      const result = await api.addToCampaign({
        leadIds: [leadId],
        campaignId: selectedCampaignId,
        organizationId,
      })

      if (result.alreadyInCampaign > 0) {
        setError('Already in this campaign')
        setIsAdding(false)
        return
      }

      // Bust caches so data is fresh
      await clearCachedQuickContext(organizationId)
      if (linkedInUrl) {
        await clearCachedLeadLookup(organizationId, linkedInUrl)
      }

      setSuccess(true)
      const campaign = campaigns.find((c) => c.id === selectedCampaignId)
      onSuccess?.(selectedCampaignId, campaign?.name || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to campaign')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="selector-group">
      <div className="selector-item">
        <span className="selector-label">
          <ListPlus size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Add to Campaign
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="selector"
            value={selectedCampaignId}
            onChange={(e) => {
              setSelectedCampaignId(e.target.value)
              setError(null)
            }}
            disabled={isAdding}
          >
            <option value="">Select campaign...</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.leadCount} leads)
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            disabled={!selectedCampaignId || isAdding}
            onClick={handleAdd}
            style={{ flexShrink: 0 }}
          >
            {isAdding ? <Loader2 size={14} className="spinning" /> : 'Add'}
          </button>
        </div>
        {error && (
          <span style={{ fontSize: 12, color: 'var(--text-error, #ef4444)', marginTop: 4 }}>
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
