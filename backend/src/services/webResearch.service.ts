/**
 * Web Research Service
 *
 * Orchestrates web research tasks using Crawl4AI + Qwen (with Firecrawl fallback).
 * Creates tasks, executes crawls, maps extracted data to custom fields,
 * and creates approval records for user review.
 */

import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { decrypt } from '@/lib/encryption'
import logger from '@/lib/logger'
import * as firecrawlClient from '@/clients/firecrawl.client'
import * as crawl4aiClient from '@/clients/crawl4ai.client'
import * as qwenClient from '@/clients/qwen.client'
import type {
  ResearchTaskResponse,
  ResearchTaskDetailResponse,
  ResearchTaskStatus,
  BulkResearchTasksResponse,
} from '@shared/types/src/requests/research'

// === Task Management ===

export async function createTask(
  organizationId: string,
  createdById: string,
  data: {
    leadId: string
    templateId?: string
    customPrompt?: string
    targetUrls?: string[]
    priority?: number
  },
): Promise<ResearchTaskResponse> {
  // Verify lead exists
  const lead = await db
    .selectFrom('lead')
    .where('id', '=', data.leadId)
    .where('organizationId', '=', organizationId)
    .where('deletedAt', 'is', null)
    .selectAll()
    .executeTakeFirst()

  if (!lead) {
    throw new Error('Lead not found')
  }

  // If template provided, fetch it
  let template: any = null
  if (data.templateId) {
    template = await db
      .selectFrom('research_template')
      .where('id', '=', data.templateId)
      .where((eb) =>
        eb.or([
          eb('organizationId', '=', organizationId),
          eb('isSystemTemplate', '=', true),
        ]),
      )
      .where('isActive', '=', true)
      .selectAll()
      .executeTakeFirst()

    if (!template) {
      throw new Error('Template not found or not accessible')
    }
  }

  // Resolve target URLs from template patterns and lead data
  const resolvedUrls = resolveTargetUrls(
    data.targetUrls ?? template?.targetUrls ?? [],
    lead,
  )

  const task = await db
    .insertInto('research_task')
    .values({
      id: uuidv4(),
      organizationId,
      leadId: data.leadId,
      templateId: data.templateId ?? null,
      customPrompt: data.customPrompt ?? null,
      targetUrls: resolvedUrls,
      status: 'pending',
      priority: data.priority ?? 0,
      retryCount: 0,
      maxRetries: 3,
      creditsUsed: 0,
      crawlCount: 0,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  // Record history
  await recordHistory(
    organizationId,
    lead.id,
    task.id,
    'task_created',
    {
      templateId: data.templateId,
      targetUrls: resolvedUrls,
      priority: data.priority,
    },
    createdById,
  )

  return transformTask(task, lead, template)
}

export async function createBulkTasks(
  organizationId: string,
  createdById: string,
  data: {
    leadIds: string[]
    templateId?: string
    customPrompt?: string
    targetUrls?: string[]
    priority?: number
  },
): Promise<BulkResearchTasksResponse> {
  const taskIds: string[] = []
  const errors: Array<{ leadId: string; error: string }> = []

  for (const leadId of data.leadIds) {
    try {
      const task = await createTask(organizationId, createdById, {
        leadId,
        templateId: data.templateId,
        customPrompt: data.customPrompt,
        targetUrls: data.targetUrls,
        priority: data.priority,
      })
      taskIds.push(task.id)
    } catch (error) {
      errors.push({
        leadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    totalRequested: data.leadIds.length,
    totalCreated: taskIds.length,
    taskIds,
    errors,
  }
}

export async function getTask(
  taskId: string,
  organizationId: string,
): Promise<ResearchTaskDetailResponse> {
  const task = await db
    .selectFrom('research_task as rt')
    .leftJoin('lead as l', 'l.id', 'rt.leadId')
    .leftJoin('research_template as t', 't.id', 'rt.templateId')
    .where('rt.id', '=', taskId)
    .where('rt.organizationId', '=', organizationId)
    .select([
      'rt.id',
      'rt.organizationId',
      'rt.leadId',
      'rt.templateId',
      'rt.customPrompt',
      'rt.targetUrls',
      'rt.status',
      'rt.priority',
      'rt.startedAt',
      'rt.completedAt',
      'rt.errorMessage',
      'rt.retryCount',
      'rt.maxRetries',
      'rt.rawResults',
      'rt.extractedData',
      'rt.creditsUsed',
      'rt.crawlCount',
      'rt.createdById',
      'rt.createdAt',
      'rt.updatedAt',
      'l.firstName as leadFirstName',
      'l.lastName as leadLastName',
      't.name as templateName',
    ])
    .executeTakeFirst()

  if (!task) {
    throw new Error('Task not found')
  }

  // Get approvals
  const approvals = await db
    .selectFrom('research_approval as ra')
    .leftJoin('custom_field_schema as cfs', 'cfs.id', 'ra.fieldSchemaId')
    .leftJoin('user as u', 'u.id', 'ra.reviewedById')
    .where('ra.researchTaskId', '=', taskId)
    .select([
      'ra.id',
      'ra.researchTaskId',
      'ra.leadId',
      'ra.fieldSchemaId',
      'ra.fieldName',
      'ra.fieldType',
      'ra.currentValue',
      'ra.proposedValue',
      'ra.source',
      'ra.confidence',
      'ra.status',
      'ra.reviewedById',
      'ra.reviewedAt',
      'ra.modifiedValue',
      'ra.rejectionReason',
      'ra.createdAt',
      'ra.updatedAt',
      'cfs.label as fieldLabel',
      'u.name as reviewedByName',
    ])
    .execute()

  const pendingApprovalCount = approvals.filter(
    (a) => a.status === 'pending',
  ).length

  return {
    id: task.id,
    organizationId: task.organizationId,
    leadId: task.leadId,
    leadName:
      task.leadFirstName || task.leadLastName
        ? `${task.leadFirstName || ''} ${task.leadLastName || ''}`.trim()
        : null,
    templateId: task.templateId,
    templateName: task.templateName,
    customPrompt: task.customPrompt,
    targetUrls: task.targetUrls ?? [],
    status: task.status as ResearchTaskStatus,
    priority: task.priority,
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    errorMessage: task.errorMessage,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
    creditsUsed: task.creditsUsed,
    crawlCount: task.crawlCount,
    pendingApprovalCount,
    createdById: task.createdById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    rawResults: task.rawResults,
    extractedData: task.extractedData,
    approvals: approvals.map((a) => ({
      id: a.id,
      researchTaskId: a.researchTaskId,
      leadId: a.leadId,
      fieldSchemaId: a.fieldSchemaId,
      fieldName: a.fieldName,
      fieldLabel: a.fieldLabel,
      fieldType: a.fieldType,
      currentValue: a.currentValue,
      proposedValue: a.proposedValue,
      source: a.source,
      confidence: a.confidence ? Number(a.confidence) : null,
      status: a.status as any,
      reviewedById: a.reviewedById,
      reviewedByName: a.reviewedByName,
      reviewedAt: a.reviewedAt?.toISOString() ?? null,
      modifiedValue: a.modifiedValue,
      rejectionReason: a.rejectionReason,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  }
}

export async function listTasks(
  organizationId: string,
  filters: {
    leadId?: string
    status?: ResearchTaskStatus
  },
  pagination: { page: number; limit: number },
): Promise<{
  data: ResearchTaskResponse[]
  total: number
  page: number
  limit: number
}> {
  let query = db
    .selectFrom('research_task as rt')
    .leftJoin('lead as l', 'l.id', 'rt.leadId')
    .leftJoin('research_template as t', 't.id', 'rt.templateId')
    .where('rt.organizationId', '=', organizationId)

  if (filters.leadId) {
    query = query.where('rt.leadId', '=', filters.leadId)
  }
  if (filters.status) {
    query = query.where('rt.status', '=', filters.status)
  }

  const countResult = await query
    .select((eb) => eb.fn.countAll().as('count'))
    .executeTakeFirstOrThrow()

  const offset = (pagination.page - 1) * pagination.limit

  const tasks = await query
    .select([
      'rt.id',
      'rt.organizationId',
      'rt.leadId',
      'rt.templateId',
      'rt.customPrompt',
      'rt.targetUrls',
      'rt.status',
      'rt.priority',
      'rt.startedAt',
      'rt.completedAt',
      'rt.errorMessage',
      'rt.retryCount',
      'rt.maxRetries',
      'rt.creditsUsed',
      'rt.crawlCount',
      'rt.createdById',
      'rt.createdAt',
      'rt.updatedAt',
      'l.firstName as leadFirstName',
      'l.lastName as leadLastName',
      't.name as templateName',
    ])
    .orderBy('rt.createdAt', 'desc')
    .limit(pagination.limit)
    .offset(offset)
    .execute()

  // Get pending approval counts for each task
  const taskIds = tasks.map((t) => t.id)
  let approvalCounts: Record<string, number> = {}
  if (taskIds.length > 0) {
    const counts = await db
      .selectFrom('research_approval')
      .where('researchTaskId', 'in', taskIds)
      .where('status', '=', 'pending')
      .groupBy('researchTaskId')
      .select(['researchTaskId', (eb) => eb.fn.countAll().as('count')])
      .execute()
    approvalCounts = counts.reduce(
      (acc, c) => ({ ...acc, [c.researchTaskId]: Number(c.count) }),
      {},
    )
  }

  return {
    data: tasks.map((task) => ({
      id: task.id,
      organizationId: task.organizationId,
      leadId: task.leadId,
      leadName:
        task.leadFirstName || task.leadLastName
          ? `${task.leadFirstName || ''} ${task.leadLastName || ''}`.trim()
          : null,
      templateId: task.templateId,
      templateName: task.templateName,
      customPrompt: task.customPrompt,
      targetUrls: task.targetUrls ?? [],
      status: task.status as ResearchTaskStatus,
      priority: task.priority,
      startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      errorMessage: task.errorMessage,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      creditsUsed: task.creditsUsed,
      crawlCount: task.crawlCount,
      pendingApprovalCount: approvalCounts[task.id] ?? 0,
      createdById: task.createdById,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    total: Number(countResult.count),
    page: pagination.page,
    limit: pagination.limit,
  }
}

export async function cancelTask(
  taskId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const task = await db
    .selectFrom('research_task')
    .where('id', '=', taskId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()

  if (!task) {
    throw new Error('Task not found')
  }

  if (task.status === 'completed' || task.status === 'failed') {
    throw new Error('Cannot cancel a completed or failed task')
  }

  await db
    .updateTable('research_task')
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where('id', '=', taskId)
    .execute()

  await recordHistory(
    organizationId,
    task.leadId,
    taskId,
    'task_cancelled',
    {
      previousStatus: task.status,
    },
    userId,
  )
}

export async function retryTask(
  taskId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const task = await db
    .selectFrom('research_task')
    .where('id', '=', taskId)
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()

  if (!task) {
    throw new Error('Task not found')
  }

  if (task.status !== 'failed' && task.status !== 'cancelled') {
    throw new Error('Can only retry failed or cancelled tasks')
  }

  if (task.retryCount >= task.maxRetries) {
    throw new Error('Maximum retry count reached')
  }

  await db
    .updateTable('research_task')
    .set({
      status: 'pending',
      errorMessage: null,
      retryCount: task.retryCount + 1,
      updatedAt: new Date(),
    })
    .where('id', '=', taskId)
    .execute()

  await recordHistory(
    organizationId,
    task.leadId,
    taskId,
    'task_retried',
    {
      retryCount: task.retryCount + 1,
    },
    userId,
  )
}

// === Task Execution (called by worker) ===

export async function executeTask(taskId: string): Promise<void> {
  const task = await db
    .selectFrom('research_task as rt')
    .leftJoin('research_template as t', 't.id', 'rt.templateId')
    .where('rt.id', '=', taskId)
    .select([
      'rt.id',
      'rt.organizationId',
      'rt.leadId',
      'rt.templateId',
      'rt.customPrompt',
      'rt.targetUrls',
      't.prompt as templatePrompt',
      't.extractionSchema',
      't.fieldMappings',
    ])
    .executeTakeFirst()

  if (!task) {
    throw new Error('Task not found')
  }

  // Mark as running
  await db
    .updateTable('research_task')
    .set({
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where('id', '=', taskId)
    .execute()

  await recordHistory(
    task.organizationId,
    task.leadId,
    taskId,
    'task_started',
    {},
    null,
  )

  try {
    const connections = await getResearchConnections(task.organizationId)
    if (connections.length === 0) {
      throw new Error(
        'No research provider configured. Connect Crawl4AI or Firecrawl in Data Vendors.',
      )
    }
    let activeConnection = connections[0]

    // Get lead data for URL resolution
    const lead = await db
      .selectFrom('lead')
      .where('id', '=', task.leadId)
      .selectAll()
      .executeTakeFirst()

    if (!lead) {
      throw new Error('Lead not found')
    }

    const prompt = task.customPrompt ?? task.templatePrompt ?? ''
    const extractionSchema = normalizeExtractionSchema(task.extractionSchema)
    const fieldMappings = normalizeStringMap(task.fieldMappings)
    const targetUrls =
      task.targetUrls && task.targetUrls.length > 0
        ? task.targetUrls
        : buildFallbackTargetUrls(lead)

    if (targetUrls.length === 0) {
      throw new Error(
        'No target URLs resolved for this task. Add target URLs or a lead website domain.',
      )
    }

    let executionResult: ExecutionResult
    if (activeConnection.provider === 'crawl4ai') {
      try {
        executionResult = await executeWithCrawl4aiQwen({
          apiKey: decrypt(activeConnection.apiKeyEncrypted),
          prompt,
          extractionSchema,
          targetUrls,
          lead,
        })
      } catch (error) {
        const firecrawlFallback = connections.find(
          (connection) => connection.provider === 'firecrawl',
        )
        if (!firecrawlFallback) {
          throw error
        }
        logger.warn(
          {
            taskId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Crawl4AI execution failed; falling back to Firecrawl',
        )
        activeConnection = firecrawlFallback
        executionResult = await executeWithFirecrawl({
          apiKey: decrypt(activeConnection.apiKeyEncrypted),
          prompt,
          extractionSchema,
          targetUrls,
        })
      }
    } else {
      executionResult = await executeWithFirecrawl({
        apiKey: decrypt(activeConnection.apiKeyEncrypted),
        prompt,
        extractionSchema,
        targetUrls,
      })
    }

    const { rawResults, extractedData, crawlCount, sourceUrls } =
      executionResult

    // Update last sync timestamp
    await db
      .updateTable('data_vendor_connection')
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where('id', '=', activeConnection.id)
      .execute()

    // Create approval records for extracted data
    for (const [extractedField, value] of Object.entries(extractedData)) {
      if (value === null || value === undefined || value === '') {
        continue
      }

      // Find the target custom field from mappings
      const targetField = fieldMappings[extractedField] ?? extractedField

      // Get current value from lead's customFields
      const customFields = (lead.customFields ?? {}) as Record<string, unknown>
      const currentValue = customFields[targetField] ?? null

      const proposedValue = stringifyValueForApproval(value)
      if (!proposedValue) continue

      // Create approval record
      await db
        .insertInto('research_approval')
        .values({
          id: uuidv4(),
          researchTaskId: taskId,
          leadId: task.leadId,
          fieldSchemaId: null, // Would link to custom_field_schema if exists
          fieldName: targetField,
          fieldType: inferApprovalFieldType(value),
          currentValue:
            currentValue !== null && currentValue !== undefined
              ? stringifyValueForApproval(currentValue)
              : null,
          proposedValue,
          source: sourceUrls.length > 0 ? sourceUrls.join(', ') : null,
          confidence: null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute()
    }

    // Mark task as completed
    await db
      .updateTable('research_task')
      .set({
        status: 'completed',
        completedAt: new Date(),
        rawResults: JSON.stringify(rawResults),
        extractedData: JSON.stringify(extractedData),
        creditsUsed: 0,
        crawlCount,
        updatedAt: new Date(),
      })
      .where('id', '=', taskId)
      .execute()

    await recordHistory(
      task.organizationId,
      task.leadId,
      taskId,
      'task_completed',
      {
        crawlCount,
        fieldsExtracted: Object.keys(extractedData),
      },
      null,
    )
  } catch (error) {
    logger.error({ error, taskId }, 'Task execution failed')

    await db
      .updateTable('research_task')
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where('id', '=', taskId)
      .execute()

    await recordHistory(
      task.organizationId,
      task.leadId,
      taskId,
      'task_failed',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      null,
    )

    throw error
  }
}

// === Helper Functions ===

type NormalizedExtractionFieldType = firecrawlClient.ExtractionField['type']

interface NormalizedExtractionField {
  description: string
  type: NormalizedExtractionFieldType
  required: boolean
}

type NormalizedExtractionSchema = Record<string, NormalizedExtractionField>

interface ExecutionResult {
  rawResults: any[]
  extractedData: Record<string, unknown>
  crawlCount: number
  sourceUrls: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeStringMap(value: unknown): Record<string, string> {
  const parsed = parseJsonObject(value)
  return Object.entries(parsed).reduce<Record<string, string>>(
    (acc, [k, v]) => {
      if (typeof v === 'string') {
        acc[k] = v
      }
      return acc
    },
    {},
  )
}

function defaultExtractionSchema(): NormalizedExtractionSchema {
  return {
    company_name: {
      description: 'The company name',
      type: 'string',
      required: false,
    },
    company_description: {
      description: 'Brief company description',
      type: 'string',
      required: false,
    },
    funding_info: {
      description: 'Funding information',
      type: 'string',
      required: false,
    },
    employee_count: {
      description: 'Number of employees',
      type: 'string',
      required: false,
    },
    industry: {
      description: 'Industry or sector',
      type: 'string',
      required: false,
    },
    recent_news: {
      description: 'Recent news or updates',
      type: 'string',
      required: false,
    },
  }
}

function normalizeExtractionSchema(value: unknown): NormalizedExtractionSchema {
  const raw = parseJsonObject(value)
  const normalized: NormalizedExtractionSchema = {}
  const validTypes: NormalizedExtractionFieldType[] = [
    'string',
    'number',
    'boolean',
    'array',
    'object',
  ]

  for (const [fieldName, fieldValue] of Object.entries(raw)) {
    const fieldObj = isRecord(fieldValue) ? fieldValue : {}
    const typeCandidate = fieldObj.type
    const type = validTypes.includes(
      typeCandidate as NormalizedExtractionFieldType,
    )
      ? (typeCandidate as NormalizedExtractionFieldType)
      : 'string'

    normalized[fieldName] = {
      description:
        typeof fieldObj.description === 'string'
          ? fieldObj.description
          : fieldName,
      type,
      required: !!fieldObj.required,
    }
  }

  if (Object.keys(normalized).length === 0) {
    return defaultExtractionSchema()
  }

  return normalized
}

async function getResearchConnections(organizationId: string): Promise<any[]> {
  const connections = await db
    .selectFrom('data_vendor_connection')
    .where('organizationId', '=', organizationId)
    .where('provider', 'in', ['crawl4ai', 'firecrawl'])
    .where('isActive', '=', true)
    .selectAll()
    .execute()

  if (connections.length === 0) return []

  const providerRank: Record<string, number> = {
    crawl4ai: 0,
    firecrawl: 1,
  }

  connections.sort((a, b) => {
    const byProvider =
      (providerRank[a.provider] ?? 99) - (providerRank[b.provider] ?? 99)
    if (byProvider !== 0) return byProvider
    return a.priority - b.priority
  })

  return connections
}

function buildFirecrawlSchema(
  extractionSchema: NormalizedExtractionSchema,
  prompt: string,
): firecrawlClient.ExtractionSchema {
  return {
    name: 'lead_research',
    description:
      prompt || 'Extract relevant information about the person/company',
    fields: Object.entries(extractionSchema).map(([name, spec]) => ({
      name,
      description: spec.description,
      type: spec.type,
      required: spec.required,
    })),
  }
}

async function executeWithFirecrawl(input: {
  apiKey: string
  prompt: string
  extractionSchema: NormalizedExtractionSchema
  targetUrls: string[]
}): Promise<ExecutionResult> {
  const schema = buildFirecrawlSchema(input.extractionSchema, input.prompt)
  const rawResults: any[] = []
  const extractedData: Record<string, unknown> = {}
  const sourceUrls: string[] = []
  let crawlCount = 0

  for (const url of input.targetUrls) {
    try {
      const result = await firecrawlClient.extract(input.apiKey, url, schema, {
        prompt: input.prompt,
        timeout: 60_000,
      })

      rawResults.push({
        provider: 'firecrawl',
        url,
        success: result.success,
        extractedData: result.extractedData,
        markdown: result.markdown,
        error: result.errorMessage,
      })

      if (result.success) {
        crawlCount++
        sourceUrls.push(url)
        Object.assign(extractedData, result.extractedData)
      }
    } catch (error) {
      logger.error({ error, url }, 'Firecrawl extraction failed')
      rawResults.push({
        provider: 'firecrawl',
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { rawResults, extractedData, crawlCount, sourceUrls }
}

function extractDomainFromLead(lead: any): string | null {
  if (!lead?.website || typeof lead.website !== 'string') return null
  try {
    const url = lead.website.startsWith('http')
      ? lead.website
      : `https://${lead.website}`
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return lead.website.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0]
  }
}

function buildFallbackTargetUrls(lead: any): string[] {
  const domain = extractDomainFromLead(lead)
  if (!domain) return []

  const root = `https://${domain}`
  return [
    root,
    `${root}/about`,
    `${root}/services`,
    `${root}/work`,
    `${root}/careers`,
    `${root}/jobs`,
  ]
}

function buildSchemaInstructions(schema: NormalizedExtractionSchema): string {
  return Object.entries(schema)
    .map(([field, spec]) => {
      const required = spec.required ? 'required' : 'optional'
      return `- ${field} (${spec.type}, ${required}): ${spec.description}`
    })
    .join('\n')
}

function buildCrawlContext(
  results: crawl4aiClient.Crawl4aiCrawlResult[],
): string {
  const totalLimit = 32_000
  const perPageLimit = 4_500
  let used = 0
  const sections: string[] = []

  for (const result of results) {
    if (!result.markdown) continue

    const normalized = result.markdown.replace(/\s+\n/g, '\n').trim()
    if (!normalized) continue

    const header = `URL: ${result.url}\n`
    const available = totalLimit - used - header.length
    if (available <= 0) break

    const snippet = normalized.slice(0, Math.min(perPageLimit, available))
    sections.push(`${header}${snippet}`)
    used += header.length + snippet.length
  }

  return sections.join('\n\n---\n\n')
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (['true', 'yes', 'y', '1'].includes(lowered)) return true
    if (['false', 'no', 'n', '0'].includes(lowered)) return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return null
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceByType(
  value: unknown,
  type: NormalizedExtractionFieldType,
): unknown {
  if (value === null || value === undefined) return null

  if (type === 'number') {
    return normalizeNumber(value)
  }

  if (type === 'boolean') {
    return normalizeBoolean(value)
  }

  if (type === 'array') {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      if (!value.trim()) return []
      return value
        .split(/\n|,/g)
        .map((v) => v.trim())
        .filter(Boolean)
    }
    return [value]
  }

  if (type === 'object') {
    if (isRecord(value)) return value
    return { value }
  }

  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (Array.isArray(value)) return value.join(', ')
  if (isRecord(value)) return JSON.stringify(value)
  return null
}

function normalizeExtractedData(
  raw: unknown,
  schema: NormalizedExtractionSchema,
): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  const rawObject = parseJsonObject(raw)

  for (const [field, spec] of Object.entries(schema)) {
    output[field] = coerceByType(rawObject[field], spec.type)
  }

  for (const [key, value] of Object.entries(rawObject)) {
    if (!(key in output)) {
      output[key] = value
    }
  }

  return output
}

async function executeWithCrawl4aiQwen(input: {
  apiKey: string
  prompt: string
  extractionSchema: NormalizedExtractionSchema
  targetUrls: string[]
  lead: any
}): Promise<ExecutionResult> {
  const crawlResults = await crawl4aiClient.crawl(
    input.apiKey,
    input.targetUrls,
    {
      baseUrl: process.env.CRAWL4AI_BASE_URL,
      timeoutMs: 120_000,
    },
  )

  const rawResults = crawlResults.map((result) => ({
    provider: 'crawl4ai',
    url: result.url,
    success: result.success,
    markdown: result.markdown,
    title: result.title,
    links: result.links,
    error: result.errorMessage,
  }))

  const successful = crawlResults.filter(
    (result) => result.success && result.markdown,
  )
  if (successful.length === 0) {
    const firstError = crawlResults.find(
      (result) => result.errorMessage,
    )?.errorMessage
    throw new Error(firstError || 'Crawl4AI failed for all target URLs')
  }

  const context = buildCrawlContext(successful)
  if (!context) {
    throw new Error('Crawl4AI did not return usable page content')
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const systemPrompt = `You are a web research extraction agent.
You must return a single valid JSON object and nothing else.
Use only the crawled evidence provided by the user.
If a field cannot be verified from evidence, set it to null.
Today is ${todayIso}.`

  const schemaInstructions = buildSchemaInstructions(input.extractionSchema)
  const userPrompt = `Research objective:
${input.prompt || 'Extract structured data from the provided pages.'}

Output fields (exact keys):
${schemaInstructions}

Rules:
- Do not fabricate.
- Use exact URLs from evidence for any URL fields.
- Preserve date text exactly as shown on source pages when available.
- If there is conflicting evidence, prefer the most recent source and explain in reason.

Lead context:
- domain: ${extractDomainFromLead(input.lead) || 'unknown'}
- company: ${input.lead?.company || 'unknown'}

Visited pages:
${successful.map((r) => `- ${r.url}`).join('\n')}

Crawled page content:
${context}`

  const llmOutput = await qwenClient.extractJson<Record<string, unknown>>({
    systemPrompt,
    userPrompt,
  })

  const extractedData = normalizeExtractedData(
    llmOutput,
    input.extractionSchema,
  )
  const leadDomain = extractDomainFromLead(input.lead)
  if (!extractedData.domain && leadDomain) {
    extractedData.domain = leadDomain
  }
  if (!extractedData.stepsTaken) {
    extractedData.stepsTaken = successful.map(
      (result) => `Visited ${result.url}`,
    )
  }

  return {
    rawResults,
    extractedData,
    crawlCount: successful.length,
    sourceUrls: successful.map((result) => result.url),
  }
}

function stringifyValueForApproval(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  try {
    const json = JSON.stringify(value)
    return json && json !== 'null' ? json : null
  } catch {
    return String(value)
  }
}

function inferApprovalFieldType(value: unknown): string {
  if (typeof value === 'number') return 'number'
  return 'text'
}

function resolveTargetUrls(urlPatterns: string[], lead: any): string[] {
  const normalizeToHttpUrl = (candidate: string): string | null => {
    const trimmed = candidate.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
      return `https://${trimmed}`
    }
    return null
  }

  const resolved = urlPatterns
    .map((pattern) => {
      let value = pattern

      // Replace placeholders with lead data
      value = value.replace('{company_website}', lead.website ?? '')
      value = value.replace('{company}', encodeURIComponent(lead.company ?? ''))
      value = value.replace('{linkedin_url}', lead.linkedInUrl ?? '')
      value = value.replace(
        '{first_name}',
        encodeURIComponent(lead.firstName ?? ''),
      )
      value = value.replace(
        '{last_name}',
        encodeURIComponent(lead.lastName ?? ''),
      )
      value = value.replace('{email}', encodeURIComponent(lead.email ?? ''))

      return normalizeToHttpUrl(value)
    })
    .filter((url): url is string => !!url)

  return [...new Set(resolved)]
}

function transformTask(
  task: any,
  lead: any,
  template: any,
): ResearchTaskResponse {
  return {
    id: task.id,
    organizationId: task.organizationId,
    leadId: task.leadId,
    leadName:
      lead.firstName || lead.lastName
        ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
        : null,
    templateId: task.templateId,
    templateName: template?.name ?? null,
    customPrompt: task.customPrompt,
    targetUrls: task.targetUrls ?? [],
    status: task.status,
    priority: task.priority,
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    errorMessage: task.errorMessage,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
    creditsUsed: task.creditsUsed,
    crawlCount: task.crawlCount,
    pendingApprovalCount: 0,
    createdById: task.createdById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

async function recordHistory(
  organizationId: string,
  leadId: string | null,
  taskId: string | null,
  action: string,
  details: Record<string, unknown>,
  performedById: string | null,
): Promise<void> {
  await db
    .insertInto('research_history')
    .values({
      id: uuidv4(),
      organizationId,
      leadId,
      taskId,
      action,
      details: JSON.stringify(details),
      performedById,
      createdAt: new Date(),
    })
    .execute()
}
