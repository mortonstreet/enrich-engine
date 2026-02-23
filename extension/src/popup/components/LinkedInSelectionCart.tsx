import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ListPlus,
  Trash2,
} from 'lucide-react'
import { api } from '../../lib/api'
import type {
  BulkEnrichJobStatusResponse,
  CrmConnectionItem,
  LinkedInSelectionItem,
} from '../../types'

interface LinkedInSelectionCartProps {
  userId: string
  organizationId: string
  connectedCrms: CrmConnectionItem[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildDefaultListName(): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `LinkedIn Selection ${date}`
}

function getDisplayName(item: LinkedInSelectionItem): string {
  return (
    item.fullName ||
    [item.firstName, item.lastName].filter(Boolean).join(' ') ||
    item.canonicalLinkedInUrl
  )
}

export function LinkedInSelectionCart({
  userId,
  organizationId,
  connectedCrms,
}: LinkedInSelectionCartProps) {
  const scopeKey = useMemo(() => `${userId}:${organizationId}`, [userId, organizationId])
  const [items, setItems] = useState<LinkedInSelectionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [listName, setListName] = useState(buildDefaultListName)
  const [listDescription, setListDescription] = useState('')
  const [autoEnrich, setAutoEnrich] = useState(true)
  const [crmAfterEnrich, setCrmAfterEnrich] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [correlationId, setCorrelationId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<BulkEnrichJobStatusResponse | null>(
    null,
  )

  useEffect(() => {
    let isMounted = true

    const syncScopeAndLoad = async () => {
      try {
        setIsLoading(true)
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const response = await chrome.runtime.sendMessage({
          type: 'SET_SELECTION_SCOPE',
          tabId: tab?.id,
          data: { scopeKey },
        })
        if (!isMounted) return
        setItems(response?.items ?? [])
      } catch (err) {
        if (!isMounted) return
        setError(
          err instanceof Error ? err.message : 'Failed to load selection cart',
        )
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const handleRuntimeMessage = (message: any) => {
      if (message?.type !== 'SELECTION_CART_UPDATED') return
      const payload = message.data
      if (!payload || payload.scopeKey !== scopeKey) return
      setItems(Array.isArray(payload.items) ? payload.items : [])
    }

    chrome.runtime.onMessage.addListener(handleRuntimeMessage)
    syncScopeAndLoad()

    return () => {
      isMounted = false
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
    }
  }, [scopeKey])

  async function removeItem(canonicalLinkedInUrl: string) {
    await chrome.runtime.sendMessage({
      type: 'REMOVE_SELECTION',
      data: { scopeKey, canonicalLinkedInUrl },
    })
  }

  async function clearCart() {
    await chrome.runtime.sendMessage({
      type: 'CLEAR_SELECTION_CART',
      data: { scopeKey },
    })
  }

  async function waitForBulkJob(jobId: string): Promise<BulkEnrichJobStatusResponse> {
    while (true) {
      const currentStatus = await api.getBulkJobStatus(jobId)
      setJobStatus(currentStatus)
      setCorrelationId(currentStatus.correlationId)
      if (
        currentStatus.state === 'completed' ||
        currentStatus.state === 'failed'
      ) {
        return currentStatus
      }
      await sleep(1500)
    }
  }

  async function handleCreateFlow() {
    if (items.length === 0) return
    if (!listName.trim()) {
      setError('List name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setStatus(null)
    setCorrelationId(null)
    setJobStatus(null)

    try {
      const createResult = await api.createListFromLinkedInSelection({
        listName: listName.trim(),
        listDescription: listDescription.trim() || undefined,
        selections: items,
      })
      setCorrelationId(createResult.correlationId)

      setStatus(
        `Created list "${createResult.listName}" with ${createResult.leadIds.length} lead(s).`,
      )
      await clearCart()

      if (autoEnrich) {
        setStatus(`Queued enrichment for list "${createResult.listName}"...`)
        const queued = await api.bulkEnrichList(createResult.listId)
        setCorrelationId(queued.correlationId)
        const finalJobStatus = await waitForBulkJob(queued.jobId)

        if (finalJobStatus.state === 'failed') {
          throw new Error(finalJobStatus.errorMessage || 'Bulk enrichment failed')
        }

        if (finalJobStatus.result) {
          setStatus(
            `Enrichment complete: ${finalJobStatus.result.totalEnriched} enriched, ${finalJobStatus.result.totalFailed} failed.`,
          )
        }

        if (crmAfterEnrich) {
          const pushResult = await api.bulkPushListToCrm(
            createResult.listId,
            crmAfterEnrich,
          )
          setCorrelationId(pushResult.correlationId)
          setStatus(
            `CRM push complete: ${pushResult.totalPushed} pushed, ${pushResult.totalFailed} failed.`,
          )
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create list from selection',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="selection-cart">
      <div className="selection-cart-header">
        <h3>Selection Cart</h3>
        <span className="selection-cart-count">{items.length}</span>
      </div>

      {isLoading ? (
        <div className="message-state">
          <Loader2 size={20} className="spinning" />
          <p className="message-text">Loading selected profiles...</p>
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="message-state">
              <ListPlus size={24} />
              <p className="message-title">No profiles selected</p>
              <p className="message-text">
                Use the checkboxes on LinkedIn result cards to build your cart.
              </p>
            </div>
          ) : (
            <div className="selection-cart-list">
              {items.map((item) => (
                <div key={item.canonicalLinkedInUrl} className="selection-cart-item">
                  <div className="selection-cart-item-meta">
                    <p className="selection-cart-item-name">{getDisplayName(item)}</p>
                    <p className="selection-cart-item-subtitle">
                      {item.company || item.headline || item.sourceType}
                    </p>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => removeItem(item.canonicalLinkedInUrl)}
                    title="Remove from cart"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="selector-group">
            <div className="selector-item">
              <span className="selector-label">List Name</span>
              <input
                className="search-input"
                style={{ paddingLeft: 12 }}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
            <div className="selector-item">
              <span className="selector-label">Description (Optional)</span>
              <input
                className="search-input"
                style={{ paddingLeft: 12 }}
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                placeholder="Add context for this capture"
              />
            </div>
            <label className="selection-cart-checkbox">
              <input
                type="checkbox"
                checked={autoEnrich}
                onChange={(e) => setAutoEnrich(e.target.checked)}
              />
              <span>Run bulk enrichment after list creation</span>
            </label>
            <div className="selector-item">
              <span className="selector-label">
                Push to CRM after enrichment (Optional)
              </span>
              <select
                className="selector"
                value={crmAfterEnrich}
                onChange={(e) => setCrmAfterEnrich(e.target.value)}
                disabled={!autoEnrich}
              >
                <option value="">Do not auto-push</option>
                {connectedCrms.map((crm) => (
                  <option key={crm.provider} value={crm.provider}>
                    {crm.provider}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="error-panel">
              <div className="error-header">
                <AlertTriangle size={16} />
                <span>Bulk Flow Error</span>
              </div>
              <div className="error-message">{error}</div>
              {correlationId && (
                <div className="error-message">Correlation ID: {correlationId}</div>
              )}
            </div>
          )}

          {status && (
            <div className="selector-group" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: 13 }}>{status}</span>
              </div>
              {jobStatus && (
                <span className="selector-label" style={{ marginTop: 4 }}>
                  Job state: {jobStatus.state}
                </span>
              )}
              {correlationId && (
                <span className="selector-label" style={{ marginTop: 4 }}>
                  Correlation ID: {correlationId}
                </span>
              )}
            </div>
          )}

          <div className="selection-cart-actions">
            <button
              className="btn btn-secondary"
              onClick={clearCart}
              disabled={isSubmitting || items.length === 0}
            >
              <Trash2 size={16} />
              Clear Cart
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateFlow}
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Processing...
                </>
              ) : (
                <>
                  <ListPlus size={16} />
                  Create List
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
