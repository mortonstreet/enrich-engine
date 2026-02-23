import { useState, useEffect } from 'react'
import { X, Plus, AlertTriangle, RefreshCw } from 'lucide-react'
import { api, ExtensionContextError, isExtensionContextValid } from '../../lib/api'
import { VendorConnectForm } from './VendorConnectForm'
import { BrandLogo } from './BrandLogo'
import type { VendorConnection } from '../../types'

interface VendorSettingsProps {
  organizationId: string
}

export function VendorSettings({ organizationId }: VendorSettingsProps) {
  const [vendors, setVendors] = useState<VendorConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contextDead, setContextDead] = useState(false)

  useEffect(() => {
    loadVendors()
  }, [organizationId])

  function handleContextError(err: unknown): boolean {
    if (err instanceof ExtensionContextError || !isExtensionContextValid()) {
      setContextDead(true)
      return true
    }
    return false
  }

  async function loadVendors() {
    setError(null)
    try {
      const result = await api.getVendors(organizationId)
      setVendors(result)
    } catch (err) {
      if (handleContextError(err)) return
      console.error('Failed to load vendors:', err)
      setError('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  async function handleTest(vendorId: string) {
    setTestingId(vendorId)
    setError(null)
    try {
      const result = await api.testVendor(vendorId, organizationId)
      alert(result.success ? 'Connection successful!' : `Failed: ${result.message}`)
    } catch (err) {
      if (handleContextError(err)) return
      alert(err instanceof Error ? `Test failed: ${err.message}` : 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  async function handleToggle(vendorId: string, isActive: boolean) {
    setError(null)
    try {
      await api.updateVendor(vendorId, organizationId, { isActive: !isActive })
      loadVendors()
    } catch (err) {
      if (handleContextError(err)) return
      console.error('Failed to toggle vendor:', err)
      setError('Failed to update vendor')
    }
  }

  async function handleDisconnect(vendorId: string) {
    if (!confirm('Disconnect this vendor?')) return
    setError(null)
    try {
      await api.disconnectVendor(vendorId, organizationId)
      loadVendors()
    } catch (err) {
      if (handleContextError(err)) return
      console.error('Failed to disconnect vendor:', err)
      setError('Failed to disconnect vendor')
    }
  }

  if (loading) {
    return (
      <div className="message-state">
        <span className="loading-spinner lg" />
        <p className="message-text" style={{ marginTop: 12 }}>Loading vendors...</p>
      </div>
    )
  }

  if (contextDead) {
    return (
      <div className="vendor-settings">
        <div className="error-panel" style={{ margin: 12 }}>
          <div className="error-header">
            <AlertTriangle size={16} />
            <span>Extension Disconnected</span>
          </div>
          <div className="error-message">
            The extension context was invalidated. Close this panel, reload the extension from chrome://extensions, then reopen.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vendor-settings">
      <div className="vendor-header">
        <h3 className="settings-section-title">Enrichment Vendors</h3>
        <button className="btn-connect" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} />
          Add
        </button>
      </div>

      {error && (
        <div className="error-panel" style={{ margin: '0 0 8px' }}>
          <div className="error-header">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button
            className="icon-btn"
            title="Retry"
            onClick={loadVendors}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {showForm && (
        <VendorConnectForm
          onConnected={() => { setShowForm(false); loadVendors() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {vendors.length === 0 && !showForm && (
        <div className="message-state" style={{ padding: 24 }}>
          <p className="message-title">No vendors connected</p>
          <p className="message-text">Connect enrichment vendors to find phone numbers and emails</p>
        </div>
      )}

      <div className="vendor-list">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="vendor-card">
            <div className="vendor-card-header">
              <BrandLogo provider={vendor.provider} size={18} />
              <span className="vendor-name">{vendor.providerName}</span>
              <span className={`vendor-status ${vendor.isActive ? 'active' : 'inactive'}`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="vendor-card-actions">
              <button
                className="icon-btn"
                title={vendor.isActive ? 'Disable' : 'Enable'}
                onClick={() => handleToggle(vendor.id, vendor.isActive)}
                style={{ color: vendor.isActive ? 'var(--text-muted)' : 'var(--success)' }}
              >
                {vendor.isActive ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9h6v6H9z"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                )}
              </button>
              <button
                className="icon-btn"
                title="Test connection"
                onClick={() => handleTest(vendor.id)}
                disabled={testingId === vendor.id}
              >
                {testingId === vendor.id ? <span className="loading-spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                )}
              </button>
              <button
                className="icon-btn"
                title="Disconnect"
                style={{ color: 'var(--destructive)' }}
                onClick={() => handleDisconnect(vendor.id)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
