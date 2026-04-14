import { Worker } from 'bullmq'
import {
  EmailCandidateVerifyEvent,
  EmailCandidateVerifyEventType,
  QueueName,
} from '@/types/queues'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import * as emailVerificationService from '@/services/emailVerification.service'

const EVENT = {
  STARTED: 'email.candidate_verify.started',
  COMPLETED: 'email.candidate_verify.completed',
  FAILED: 'email.candidate_verify.failed',
  WORKER_ERROR: 'email.candidate_verify.worker.error',
} as const

export class EmailCandidateVerifyProcessor {
  private worker: Worker<EmailCandidateVerifyEvent>

  constructor() {
    this.worker = new Worker<EmailCandidateVerifyEvent>(
      QueueName.EMAIL_CANDIDATE_VERIFY,
      async (job) => {
        setRequestContext('jobId', job.id)
        setRequestContext('organizationId', job.data.organizationId)
        setRequestContext('correlationId', job.data.correlationId)

        try {
          return await Sentry.withScope(async (scope) => {
            scope.setContext('job', {
              id: job.id,
              name: job.name,
              data: job.data,
            })

            logger.info(
              {
                eventType: EVENT.STARTED,
                jobId: String(job.id),
                organizationId: job.data.organizationId,
                leadId: job.data.leadId,
                domain: job.data.domain,
                candidateCount: job.data.candidates.length,
                correlationId: job.data.correlationId,
              },
              'Starting email candidate verification job',
            )

            switch (job.data.type) {
              case EmailCandidateVerifyEventType.VERIFY_LEAD_EMAIL: {
                const decision =
                  await emailVerificationService.verifyLeadEmailCandidates({
                    organizationId: job.data.organizationId,
                    leadId: job.data.leadId,
                    domain: job.data.domain,
                    firstName: job.data.firstName,
                    lastName: job.data.lastName,
                    candidates: job.data.candidates,
                  })

                logger.info(
                  {
                    eventType: EVENT.COMPLETED,
                    jobId: String(job.id),
                    organizationId: job.data.organizationId,
                    leadId: job.data.leadId,
                    domain: decision.domain,
                    email: decision.email,
                    status: decision.status,
                    score: decision.score,
                    correlationId: job.data.correlationId,
                  },
                  'Completed email candidate verification job',
                )

                return decision
              }
              default:
                throw new Error(`Unknown event type: ${job.data.type}`)
            }
          })
        } catch (error) {
          logger.error(
            {
              eventType: EVENT.FAILED,
              error,
              jobId: job.id,
              organizationId: job.data.organizationId,
              leadId: job.data.leadId,
              domain: job.data.domain,
              correlationId: job.data.correlationId,
            },
            'Failed to process email candidate verification job',
          )
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              data: job.data,
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
        concurrency: 6,
      },
    )

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          eventType: EVENT.FAILED,
          error,
          jobId: job?.id ? String(job.id) : undefined,
          organizationId: job?.data.organizationId,
          leadId: job?.data.leadId,
          correlationId: job?.data.correlationId,
        },
        'Email candidate verification worker observed failed job event',
      )
    })

    this.worker.on('error', (error) => {
      logger.error(
        {
          eventType: EVENT.WORKER_ERROR,
          error,
        },
        'Email candidate verification worker error',
      )
    })
  }

  async close() {
    await this.worker.close()
  }
}
