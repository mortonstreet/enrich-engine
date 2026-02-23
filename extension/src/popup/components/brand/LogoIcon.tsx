interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 32, className = '' }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="OmniDial"
    >
      {/* Bold forward slash */}
      <path
        d="M17 2L7 22"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * 3D logo spinner for loading screens.
 * Uses CSS 3D transforms with stacked layers for depth effect.
 */
export function Logo3DIcon({ size = 64, className = '' }: LogoIconProps) {
  const layers = 12
  return (
    <div
      className={`logo-3d-container ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="logo-3d-spin"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        {/* Front-facing layers */}
        {Array.from({ length: layers }).map((_, i) => {
          const z = (i - layers / 2) * 0.6
          const isFace = i === 0 || i === layers - 1
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateZ(${z}px)`,
                backfaceVisibility: 'hidden',
                opacity: isFace ? 1 : 0.4,
              }}
            >
              <path
                d="M17 2L7 22"
                stroke={isFace ? 'white' : 'rgba(200,200,210,0.8)'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          )
        })}
        {/* Back-facing layers */}
        {Array.from({ length: layers }).map((_, i) => {
          const z = (i - layers / 2) * 0.6
          const isFace = i === 0 || i === layers - 1
          return (
            <svg
              key={`b-${i}`}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateZ(${z}px) rotateY(180deg)`,
                backfaceVisibility: 'hidden',
                opacity: isFace ? 1 : 0.4,
              }}
            >
              <path
                d="M17 2L7 22"
                stroke={isFace ? 'white' : 'rgba(200,200,210,0.8)'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          )
        })}
      </div>
    </div>
  )
}
