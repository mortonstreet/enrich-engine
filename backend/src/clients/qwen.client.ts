/**
 * Qwen extraction client (OpenAI-compatible chat completions).
 * Supports local/self-hosted runtimes and OpenRouter-compatible routing.
 */

import logger from '@/lib/logger'

const DEFAULT_QWEN_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_QWEN_MODEL = 'qwen/qwen-2.5-72b-instruct'

interface ChatCompletionChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[]
}

export interface QwenExtractRequest {
  systemPrompt: string
  userPrompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  apiKey?: string
  baseUrl?: string
}

function getBaseUrl(override?: string): string {
  return (
    override ||
    process.env.QWEN_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    DEFAULT_QWEN_BASE_URL
  )
    .trim()
    .replace(/\/+$/, '')
}

function getApiKey(override?: string): string {
  return (
    override || process.env.QWEN_API_KEY || process.env.OPENROUTER_API_KEY || ''
  )
}

function getModel(override?: string): string {
  return override || process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL
}

function stripCodeFences(input: string): string {
  let output = input.trim()
  if (output.startsWith('```json')) output = output.slice(7)
  if (output.startsWith('```')) output = output.slice(3)
  if (output.endsWith('```')) output = output.slice(0, -3)
  return output.trim()
}

function parseAssistantContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()
}

function buildHeaders(apiKey: string, baseUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] =
      process.env.QWEN_HTTP_REFERER ||
      process.env.FRONTEND_URL ||
      'https://localhost'
    headers['X-Title'] = process.env.QWEN_APP_TITLE || 'EnrichEngine'
  }
  return headers
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function extractJson<T extends Record<string, unknown>>(
  request: QwenExtractRequest,
): Promise<T> {
  const baseUrl = getBaseUrl(request.baseUrl)
  const apiKey = getApiKey(request.apiKey)
  const model = getModel(request.model)

  if (baseUrl.includes('openrouter.ai') && !apiKey) {
    throw new Error(
      'QWEN_API_KEY (or OPENROUTER_API_KEY) is required when using OpenRouter',
    )
  }

  const endpoint = `${baseUrl}/chat/completions`
  const maxTokens = request.maxTokens ?? 1400
  const temperature = request.temperature ?? 0.1
  const timeoutMs = 90_000

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: buildHeaders(apiKey, baseUrl),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        temperature,
      }),
    },
    timeoutMs,
  )

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(
      {
        endpoint,
        model,
        status: response.status,
        response: errorText,
      },
      'Qwen JSON extraction request failed',
    )
    throw new Error(`Qwen extraction failed (${response.status})`)
  }

  const payload = (await response.json()) as ChatCompletionResponse
  const content = parseAssistantContent(payload.choices?.[0]?.message?.content)
  if (!content) {
    throw new Error('Qwen returned an empty response')
  }

  const cleaned = stripCodeFences(content)
  try {
    return JSON.parse(cleaned) as T
  } catch (error) {
    logger.error(
      {
        error,
        content,
      },
      'Qwen returned invalid JSON',
    )
    throw new Error('Qwen returned invalid JSON')
  }
}
