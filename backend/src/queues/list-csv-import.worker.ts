import { Worker, Job } from 'bullmq'
import {
  ListCsvImportEvent,
  ListCsvImportEventType,
  QueueName,
} from '@/types/queues'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import * as leadListService from '@/services/leadList.service'
import * as leadRepo from '@/repositories/lead.repository'
import * as leadListEntryRepo from '@/repositories/leadListEntry.repository'
import * as campaignListRepo from '@/repositories/campaignList.repository'
import * as campaignLeadRepo from '@/repositories/campaign-lead.repository'
import { validateAndNormalizePhone } from '@/lib/phone'
import { parseCSV, getMappedFieldForHeader } from '@/utils/csvImport'

interface ParsedLead {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  normalizedPhone: string | null // E.164 format or null if invalid
  company?: string
  title?: string
  linkedInUrl?: string
  website?: string
  customFields: Record<string, string>
}

function mapRowToLead(
  headers: string[],
  row: string[],
):
  | { lead: ParsedLead; error?: undefined }
  | { lead?: undefined; error: string } {
  const lead: Partial<Omit<ParsedLead, 'normalizedPhone' | 'customFields'>> & {
    normalizedPhone?: string | null
    customFields: Record<string, string>
  } = {
    customFields: {},
  }

  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i]
    const value = row[i]?.trim()

    if (!value) continue

    const mappedField = getMappedFieldForHeader(header)
    if (mappedField) {
      switch (mappedField) {
        case 'firstName':
          lead.firstName = value
          break
        case 'lastName':
          lead.lastName = value
          break
        case 'email':
          lead.email = value
          break
        case 'phone':
          lead.phone = value
          break
        case 'company':
          lead.company = value
          break
        case 'title':
          lead.title = value
          break
        case 'linkedInUrl':
          lead.linkedInUrl = value
          break
        case 'website':
          lead.website = value
          break
      }
    } else {
      lead.customFields[header.trim()] = value
    }
  }

  // Require at least one identity handle: phone, LinkedIn URL, email, or website/domain.
  if (!lead.phone && !lead.linkedInUrl && !lead.email && !lead.website) {
    return {
      error:
        'Missing required identity field (phone, LinkedIn URL, email, or website/domain)',
    }
  }

  // Validate and normalize phone number only when provided.
  let normalizedPhone: string | null = null
  if (lead.phone) {
    normalizedPhone = validateAndNormalizePhone(lead.phone)
    if (!normalizedPhone) {
      return { error: `Invalid phone number format: "${lead.phone}"` }
    }
  }

  return {
    lead: {
      ...lead,
      phone: lead.phone ?? '',
      normalizedPhone,
      customFields: lead.customFields ?? {},
    } as ParsedLead,
  }
}

async function processListCsvImport(job: Job<ListCsvImportEvent>) {
  const { organizationId, listId, fileContent, fileName } = job.data

  logger.info({ listId, fileName }, 'Starting list CSV import')

  // Update import status to processing
  await leadListService.updateImportStatus(listId, 'processing')

  try {
    // Decode base64 content
    const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8')

    // Parse CSV
    const { headers, rows } = parseCSV(csvContent)

    if (headers.length === 0 || rows.length === 0) {
      throw new Error('CSV file is empty or has no data rows')
    }

    logger.info(
      { listId, headerCount: headers.length, rowCount: rows.length, headers },
      'CSV parsed',
    )

    // Map rows to leads
    const leads: ParsedLead[] = []
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const result = mapRowToLead(headers, rows[i])
      if (result.lead) {
        leads.push(result.lead)
      } else {
        errors.push({ row: i + 2, error: result.error })
      }
    }

    logger.info(
      { listId, validLeads: leads.length, errors: errors.length },
      'CSV rows processed',
    )

    if (leads.length === 0) {
      throw new Error(
        `No valid leads found - each row must include at least one identity field: phone, LinkedIn URL, email, or website/domain. Found headers: [${headers.join(', ')}].`,
      )
    }

    // Batch create leads and add to list
    const BATCH_SIZE = 100
    let totalCreated = 0
    const allLeadIds: string[] = []

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE)

      // Create leads in organization using repository
      const createdLeadIds = await leadRepo.bulkCreateIgnoreConflicts(
        organizationId,
        batch.map((lead) => ({
          firstName: lead.firstName ?? null,
          lastName: lead.lastName ?? null,
          email: lead.email ?? null,
          phone: lead.phone ?? '',
          normalizedPhone: lead.normalizedPhone,
          company: lead.company ?? null,
          title: lead.title ?? null,
          linkedInUrl: lead.linkedInUrl ?? null,
          website: lead.website ?? null,
          customFields: lead.customFields ?? {},
        })),
      )

      allLeadIds.push(...createdLeadIds)
      totalCreated += batch.length

      // Add leads to list
      await leadListEntryRepo.addLeads(listId, createdLeadIds)

      // Update job progress
      const progress = Math.round(((i + batch.length) / leads.length) * 100)
      await job.updateProgress(progress)

      logger.info(
        { listId, progress, totalCreated },
        'List CSV import progress',
      )
    }

    // Update list lead count
    await leadListService.refreshLeadCount(listId)

    // Sync with linked campaigns
    const linkedCampaigns = await campaignListRepo.findByList(listId)
    for (const campaign of linkedCampaigns) {
      const maxOrder = await campaignLeadRepo.getMaxDialOrder(
        campaign.campaignId,
      )
      await campaignLeadRepo.createMany(
        campaign.campaignId,
        allLeadIds,
        maxOrder + 1,
      )
    }

    // Update import status to completed
    await leadListService.updateImportStatus(listId, 'completed')

    logger.info(
      { listId, totalCreated, errors: errors.length },
      'List CSV import completed',
    )

    return {
      totalRows: rows.length,
      created: totalCreated,
      errors,
    }
  } catch (error) {
    // Update import status to failed
    await leadListService.updateImportStatus(
      listId,
      'failed',
      (error as Error).message,
    )
    throw error
  }
}

export class ListCsvImportProcessor {
  private worker: Worker<ListCsvImportEvent>

  constructor() {
    this.worker = new Worker<ListCsvImportEvent>(
      QueueName.LIST_CSV_IMPORT,
      async (job) => {
        setRequestContext('jobId', job.id)
        try {
          return await Sentry.withScope(async (scope) => {
            scope.setContext('job', {
              id: job.id,
              name: job.name,
              data: {
                ...job.data,
                fileContent: '[REDACTED]', // Don't log file content
              },
            })

            switch (job.data.type) {
              case ListCsvImportEventType.PROCESS_CSV:
                return await processListCsvImport(job)
              default:
                throw new Error(`Unknown event type: ${job.data.type}`)
            }
          })
        } catch (error) {
          logger.error(
            { error, jobId: job.id, listId: job.data.listId },
            'Failed to process list CSV import',
          )
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              listId: job.data.listId,
            },
          })
          throw error
        }
      },
      {
        connection: {
          url: config.redis.url,
          ...(config.redis.useTLS && {
            tls: {
              rejectUnauthorized: false,
            },
          }),
        },
        concurrency: 2, // Process 2 CSV imports at a time
      },
    )
  }

  async close() {
    await this.worker.close()
  }
}
