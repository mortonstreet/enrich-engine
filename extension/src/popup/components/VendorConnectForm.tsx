import { useState } from 'react'
import { api } from '../../lib/api'
import { BrandLogo } from './BrandLogo'

const VENDORS = [
  { key: 'prospeo', name: 'Prospeo' },
  { key: 'forager', name: 'Forager' },
  { key: 'leadmagic', name: 'LeadMagic' },
  { key: 'apollo', name: 'Apollo.io' },
  { key: 'zoominfo', name: 'ZoomInfo' },
  { key: 'clearbit', name: 'Clearbit' },
  { key: 'lusha', name: 'Lusha' },
]

interface VendorConnectFormProps {
  onConnected: () => void
  onCancel: () => void
}

export function VendorConnectForm({ onConnected, onCancel }: VendorConnectFormProps) {
  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!provider || !apiKey) return

    setLoading(true)
    setError(null)
    try {
      await api.connectVendor({ provider, apiKey })
      onConnected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="vendor-connect-form" onSubmit={handleSubmit}>
      <div className="vendor-provider-picker">
        {VENDORS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`vendor-provider-btn ${provider === v.key ? 'selected' : ''}`}
            onClick={() => setProvider(v.key)}
          >
            <BrandLogo provider={v.key} size={18} />
            {v.name}
          </button>
        ))}
      </div>

      {provider && (
        <>
          <input
            type="password"
            className="search-input"
            placeholder="Paste API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ paddingLeft: 12 }}
          />
          {error && <p className="error-message" style={{ fontSize: 12, marginTop: 4 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn btn-sm btn-primary" disabled={loading || !apiKey}>
              {loading ? <span className="loading-spinner" /> : 'Connect'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </form>
  )
}
