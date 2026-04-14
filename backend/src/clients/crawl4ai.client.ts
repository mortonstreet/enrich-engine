/**
 * Crawl4AI API client for self-hosted deployments.
 * Docs:
 * - https://docs.crawl4ai.com/core/self-hosting/
 * - https://docs.crawl4ai.com/complete-sdk-reference/
 */

import logger from '@/lib/logger'

const DEFAULT_CRAWL4AI_BASE_URL = 'http://localhost:11235'

export interface Crawl4aiCrawlResult {
  success: boolean
  url: string
  markdown?: string
  title?: string
  errorMessage?: string
  links?: string[]
}

interface CrawlRequestOptions {
  baseUrl?: string
  timeoutMs?: number
}

interface ConnectionTestOptions {
  baseUrl?: string
  timeoutMs?: number
}

function sanitizeBaseUrl(baseUrl?: string): string {
  return (baseUrl || process.env.CRAWL4AI_BASE_URL || DEFAULT_CRAWL4AI_BASE_URL)
    .trim()
    .replace(/\/+$/, '')
}

function buildAuthHeaders(apiKey: string): Record<string, string> {
  if (!apiKey) return {}
  return {
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function flattenLinks(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (!isRecord(value)) return []

  const output: string[] = []
  for (const candidate of Object.values(value)) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string') {
          output.push(item)
        } else if (isRecord(item) && typeof item.href === 'string') {
          output.push(item.href)
        } else if (isRecord(item) && typeof item.url === 'string') {
          output.push(item.url)
        }
      }
    }
  }
  return output
}

function extractResultCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  const candidates = ['results', 'result', 'data']
  for (const key of candidates) {
    const value = payload[key]
    if (Array.isArray(value)) return value
    if (isRecord(value)) return [value]
  }

  return [payload]
}

function normalizeResult(raw: unknown): Crawl4aiCrawlResult {
  if (!isRecord(raw)) {
    return {
      success: false,
      url: '',
      errorMessage: 'Invalid Crawl4AI response entry',
    }
  }

  const markdown =
    (typeof raw.markdown === 'string' && raw.markdown) ||
    (typeof raw.cleaned_markdown === 'string' && raw.cleaned_markdown) ||
    (typeof raw.raw_markdown === 'string' && raw.raw_markdown) ||
    (isRecord(raw.markdown_v2) &&
      typeof raw.markdown_v2.raw_markdown === 'string' &&
      raw.markdown_v2.raw_markdown) ||
    undefined

  const url =
    (typeof raw.url === 'string' && raw.url) ||
    (typeof raw.source === 'string' && raw.source) ||
    (typeof raw.input_url === 'string' && raw.input_url) ||
    ''

  const explicitSuccess =
    typeof raw.success === 'boolean'
      ? raw.success
      : typeof raw.status === 'string'
        ? raw.status.toLowerCase() === 'success'
        : undefined

  const errorMessage =
    (typeof raw.error === 'string' && raw.error) ||
    (typeof raw.error_message === 'string' && raw.error_message) ||
    (typeof raw.message === 'string' && raw.message) ||
    undefined

  const metadata = isRecord(raw.metadata) ? raw.metadata : undefined
  const title =
    metadata && typeof metadata.title === 'string'
      ? metadata.title
      : typeof raw.title === 'string'
        ? raw.title
        : undefined

  return {
    success:
      explicitSuccess !== undefined
        ? explicitSuccess
        : !!markdown && !errorMessage,
    url,
    markdown,
    title,
    errorMessage,
    links: flattenLinks(raw.links),
  }
}

function validateTargetUrl(url: string): void {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP(S) URLs are allowed')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
    throw new Error('Local addresses are not allowed')
  }

  const ipParts = hostname.split('.').map(Number)
  if (ipParts.length === 4 && ipParts.every((p) => !Number.isNaN(p))) {
    if (ipParts[0] === 10) throw new Error('Private IP not allowed')
    if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) {
      throw new Error('Private IP not allowed')
    }
    if (ipParts[0] === 192 && ipParts[1] === 168) {
      throw new Error('Private IP not allowed')
    }
    if (ipParts[0] === 169 && ipParts[1] === 254) {
      throw new Error('Link-local not allowed')
    }
  }
}

export async function crawl(
  apiKey: string,
  urls: string[],
  options?: CrawlRequestOptions,
): Promise<Crawl4aiCrawlResult[]> {
  const dedupedUrls = [...new Set(urls.filter(Boolean))]
  for (const url of dedupedUrls) {
    validateTargetUrl(url)
  }

  if (dedupedUrls.length === 0) return []

  const baseUrl = sanitizeBaseUrl(options?.baseUrl)
  const timeoutMs = options?.timeoutMs ?? 120_000
  const endpoint = `${baseUrl}/crawl`

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(apiKey),
        },
        body: JSON.stringify({
          urls: dedupedUrls,
          browser_config: {
            type: 'BrowserConfig',
            params: {
              headless: true,
              verbose: false,
            },
          },
          crawler_config: {
            type: 'CrawlerRunConfig',
            params: {
              stream: false,
              cache_mode: 'bypass',
            },
          },
        }),
      },
      timeoutMs,
    )

    if (!response.ok) {
      const text = await response.text()
      logger.error(
        { status: response.status, response: text, endpoint },
        'Crawl4AI crawl request failed',
      )
      throw new Error(`Crawl4AI crawl failed (${response.status})`)
    }

    const payload = (await response.json()) as unknown
    const rawResults = extractResultCandidates(payload)
    const normalized = rawResults.map(normalizeResult)

    // If no parseable results came back, emit failed rows for each input URL.
    if (normalized.length === 0) {
      return dedupedUrls.map((url) => ({
        success: false,
        url,
        errorMessage: 'No crawl results returned by Crawl4AI',
      }))
    }

    return normalized
  } catch (error) {
    logger.error({ error, endpoint, urls: dedupedUrls }, 'Crawl4AI crawl error')
    const message = error instanceof Error ? error.message : 'Unknown error'
    return dedupedUrls.map((url) => ({
      success: false,
      url,
      errorMessage: message,
    }))
  }
}

export async function testConnection(
  apiKey: string,
  options?: ConnectionTestOptions,
): Promise<{ success: boolean; message: string }> {
  const baseUrl = sanitizeBaseUrl(options?.baseUrl)
  const timeoutMs = options?.timeoutMs ?? 10_000

  try {
    const healthResponse = await fetchWithTimeout(
      `${baseUrl}/health`,
      {
        method: 'GET',
        headers: buildAuthHeaders(apiKey),
      },
      timeoutMs,
    )

    if (healthResponse.ok) {
      return {
        success: true,
        message: 'Crawl4AI connection successful',
      }
    }

    // Fall back to a tiny crawl test because some deployments may not expose /health.
    const crawlResults = await crawl(apiKey, ['https://example.com'], {
      baseUrl,
      timeoutMs,
    })
    const hasSuccess = crawlResults.some((result) => result.success)
    return {
      success: hasSuccess,
      message: hasSuccess
        ? 'Crawl4AI connection successful'
        : crawlResults[0]?.errorMessage || 'Crawl4AI connection failed',
    }
  } catch (error) {
    logger.error({ error, baseUrl }, 'Crawl4AI test connection error')
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}
