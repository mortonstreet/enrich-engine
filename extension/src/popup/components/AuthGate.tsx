import { LogIn } from 'lucide-react'
import { LogoIcon } from './brand/LogoIcon'

interface AuthGateProps {
  error?: string | null
}

export function AuthGate({ error }: AuthGateProps) {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://app.omnidial.io'

  const handleLogin = () => {
    chrome.tabs.create({ url: `${appUrl}/login` })
  }

  return (
    <div className="auth-screen">
      <div className="auth-content">
        <div className="auth-logo">
          <div className="logo-3d-container">
            <LogoIcon size={64} className="logo-3d-spin" />
          </div>
          <span className="auth-brand">Enrich</span>
        </div>

        <h1 className="auth-title">Get Started</h1>
        <p className="auth-subtitle">Sign in to enrich LinkedIn profiles and push to your CRM</p>

        <button className="btn btn-primary btn-lg" onClick={handleLogin}>
          <LogIn size={20} />
          Sign In
        </button>

        {error && (
          <div className="error-message" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
      </div>

      <div className="auth-footer">
        <p className="auth-footer-text">Enrich by OmniDial - Free enrichment tool</p>
      </div>
    </div>
  )
}
