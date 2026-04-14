import { Worker } from 'bullmq'
import {
  EmailDomainProfileEvent,
  EmailDomainProfileEventType,
  QueueName,
} from '@/types/queues'
import { config } from '@/config'
import { setRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import Sentry from '@/lib/sentry'
import * as emailVerificationService from '@/services/emailVerification.service'

const EVENT = {
  STARTED: 'email.domain_profile.started',
  COMPLETED: 'email.domain_profile.completed',
  FAILED: 'email.domain_profile.failed',
  WORKER_ERROR: 'email.domain_profile.worker.error',
} as const

export class EmailDomainProfileProcessor {
  private worker: Worker<EmailDomainProfileEvent>

  constructor() {
    this.worker = new Worker<EmailDomainProfileEvent>(
      QueueName.EMAIL_DOMAIN_PROFILE,
      async (job) => {
        setRequestContext('jobId', job.id)
        setRequestContext('organizationId', job.data.requestedByOrganizationId)
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
                domain: job.data.domain,
                forceRefresh: !!job.data.forceRefresh,
                correlationId: job.data.correlationId,
              },
              'Starting email domain profile job',
            )

            switch (job.data.type) {
              case EmailDomainProfileEventType.PROFILE_DOMAIN: {
                const profile = await emailVerificationService.profileDomain(
                  job.data.domain,
                  {
                    forceRefresh: job.data.forceRefresh,
                  },
                )

                logger.info(
                  {
                    eventType: EVENT.COMPLETED,
                    jobId: String(job.id),
                    domain: profile.domain,
                    catchAllState: profile.catchAllState,
                    mxPresent: profile.mxPresent,
                    smtpReachable: profile.smtpReachable,
                    correlationId: job.data.correlationId,
                  },
                  'Completed email domain profile job',
                )

                return profile
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
              domain: job.data.domain,
              correlationId: job.data.correlationId,
            },
            'Failed to process email domain profile job',
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
        concurrency: 4,
      },
    )

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          eventType: EVENT.FAILED,
          error,
          jobId: job?.id ? String(job.id) : undefined,
          domain: job?.data.domain,
          correlationId: job?.data.correlationId,
        },
        'Email domain profile worker observed failed job event',
      )
    })

    this.worker.on('error', (error) => {
      logger.error(
        {
          eventType: EVENT.WORKER_ERROR,
          error,
        },
        'Email domain profile worker error',
      )
    })
  }

  async close() {
    await this.worker.close()
  }
}
