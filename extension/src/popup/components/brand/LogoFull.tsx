import { LogoIcon } from './LogoIcon'

interface LogoFullProps {
  iconSize?: number
  className?: string
}

export function LogoFull({ iconSize = 40, className = '' }: LogoFullProps) {
  return (
    <div className={`logo-full ${className}`} aria-label="Enrich by OmniDial">
      <LogoIcon size={iconSize} />
      <div className="logo-wordmark-group">
        <span className="logo-wordmark">Enrich</span>
        <span className="logo-subtitle">by OmniDial</span>
      </div>
    </div>
  )
}
