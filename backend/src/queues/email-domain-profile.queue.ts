import { Queue } from 'bullmq'
import { EmailDomainProfileEvent, QueueName } from '@/types/queues'
import { config } from '@/config'

export const emailDomainProfileQueue = new Queue<EmailDomainProfileEvent>(
  QueueName.EMAIL_DOMAIN_PROFILE,
  {
    connection: {
      url: config.redis.url,
      ...(config.redis.useTLS && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    },
  },
)

export const addEmailDomainProfileJob = async (
  event: EmailDomainProfileEvent,
  attempts: number = 2,
  backoff: number = 2000,
) => {
  const dayBucket = new Date().toISOString().slice(0, 10)
  const job = await emailDomainProfileQueue.add(event.type, event, {
    attempts,
    backoff: {
      type: 'exponential',
      delay: backoff,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
    jobId: `domain-profile:${event.domain}:${dayBucket}:${event.forceRefresh ? 'force' : 'cached'}`,
  })

  return job.id
}
