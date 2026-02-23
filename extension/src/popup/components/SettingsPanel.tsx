import { ExternalLink, LogOut } from 'lucide-react'
import { LogoFull } from './brand/LogoFull'
import { CrmSettings } from './CrmSettings'

interface SettingsPanelProps {
  userEmail?: string
  organizationName?: string
  organizationId?: string
}

export function SettingsPanel({ userEmail, organizationName, organizationId }: SettingsPanelProps) {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://app.omnidial.io'

  const handleOpenApp = () => {
    chrome.tabs.create({ url: appUrl })
  }

  const handleLogout = () => {
    chrome.tabs.create({ url: `${appUrl}/logout` })
  }

  return (
    <div className="settings-tab-content">
      {/* Account Info */}
      <div className="settings-section">
        <h3 className="settings-section-title">Account</h3>
        <div className="settings-card">
          {userEmail && (
            <div className="settings-row">
              <span className="settings-label">Email</span>
              <span className="settings-value">{userEmail}</span>
            </div>
          )}
          {organizationName && (
            <div className="settings-row">
              <span className="settings-label">Organization</span>
              <span className="settings-value">{organizationName}</span>
            </div>
          )}
        </div>
      </div>

      {/* CRM Connections */}
      {organizationId && (
        <div className="settings-section">
          <CrmSettings organizationId={organizationId} />
        </div>
      )}

      {/* Actions */}
      <div className="settings-section">
        <h3 className="settings-section-title">Actions</h3>
        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={handleOpenApp}>
            <ExternalLink size={18} />
            Open OmniDial App
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <h3 className="settings-section-title">About</h3>
        <div className="settings-about">
          <LogoFull iconSize={32} />
          <p className="settings-version">Version 1.0.0</p>
        </div>
      </div>
    </div>
  )
}
