import { useState, useEffect } from 'react'
import { ExternalLink, Check, Unlink } from 'lucide-react'
import { api } from '../../lib/api'
import { BrandLogo } from './BrandLogo'
import type { CrmConnectionItem } from '../../types'

const CRM_INFO: Record<string, { name: string; color: string }> = {
  omnidial: { name: 'OmniDial', color: '#10B981' },
  hubspot: { name: 'HubSpot', color: '#FF7A59' },
  salesforce: { name: 'Salesforce', color: '#00A1E0' },
  attio: { name: 'Attio', color: '#6C5CE7' },
  pipedrive: { name: 'Pipedrive', color: '#017737' },
  monday: { name: 'Monday CRM', color: '#FF3D57' },
}

interface CrmSettingsProps {
  organizationId: string
}

export function CrmSettings({ organizationId }: CrmSettingsProps) {
  const [connectedCrms, setConnectedCrms] = useState<CrmConnectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const appUrl = import.meta.env.VITE_APP_URL || 'https://app.omnidial.io'

  useEffect(() => {
    loadCrms()
  }, [organizationId])

  async function loadCrms() {
    try {
      const result = await api.getConnectedCrms()
      setConnectedCrms(result)
    } catch (err) {
      console.error('Failed to load CRMs:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleConnect(provider: string) {
    chrome.tabs.create({ url: `${appUrl}/settings?connect=${provider}` })
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${CRM_INFO[provider]?.name || provider}?`)) return
    try {
      await api.disconnectIntegration(provider, organizationId)
      loadCrms()
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }

  const connectedProviders = new Set(connectedCrms.map((c) => c.provider))
  const allCrms = ['hubspot', 'salesforce', 'attio', 'pipedrive', 'monday']

  if (loading) {
    return (
      <div className="message-state">
        <span className="loading-spinner lg" />
        <p className="message-text" style={{ marginTop: 12 }}>Loading CRM connections...</p>
      </div>
    )
  }

  return (
    <div className="crm-settings">
      <h3 className="settings-section-title">CRM Connections</h3>

      {/* OmniDial - always connected */}
      <div className="crm-settings-card">
        <div className="crm-settings-info">
          <BrandLogo provider="omnidial" size={18} />
          <span className="crm-settings-name">OmniDial</span>
        </div>
        <span className="crm-connected-badge">
          <Check size={12} /> Connected
        </span>
      </div>

      {allCrms.map((provider) => {
        const info = CRM_INFO[provider] || { name: provider, color: '#71717a' }
        const isConnected = connectedProviders.has(provider)

        return (
          <div key={provider} className="crm-settings-card">
            <div className="crm-settings-info">
              <BrandLogo provider={provider} size={18} />
              <span className="crm-settings-name">{info.name}</span>
            </div>
            {isConnected ? (
              <div className="crm-settings-actions">
                <span className="crm-connected-badge">
                  <Check size={12} /> Connected
                </span>
                <button className="icon-btn" title="Disconnect" onClick={() => handleDisconnect(provider)}>
                  <Unlink size={14} />
                </button>
              </div>
            ) : (
              <button className="btn-connect" onClick={() => handleConnect(provider)}>
                <ExternalLink size={11} />
                Connect
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
