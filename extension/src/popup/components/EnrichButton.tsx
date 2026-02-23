import { Search, RefreshCw } from 'lucide-react'

interface EnrichButtonProps {
  onEnrich: () => void
  isLoading: boolean
  label?: string
}

export function EnrichButton({ onEnrich, isLoading, label }: EnrichButtonProps) {
  const isReEnrich = label !== undefined

  return (
    <button
      className={`btn ${isReEnrich ? 'btn-secondary' : 'btn-primary'}`}
      onClick={onEnrich}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className="loading-spinner" />
          Finding phone...
        </>
      ) : (
        <>
          {isReEnrich ? <RefreshCw size={16} /> : <Search />}
          {label || 'Enrich & Add Lead'}
        </>
      )}
    </button>
  )
}
