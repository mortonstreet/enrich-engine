import { Queue } from 'bullmq'
import { EmailCandidateVerifyEvent, QueueName } from '@/types/queues'
import { config } from '@/config'

export const emailCandidateVerifyQueue = new Queue<EmailCandidateVerifyEvent>(
  QueueName.EMAIL_CANDIDATE_VERIFY,
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

export const addEmailCandidateVerifyJob = async (
  event: EmailCandidateVerifyEvent,
  attempts: number = 2,
  backoff: number = 2000,
) => {
  const leadKey = event.leadId ?? 'no-lead'
  const primaryCandidate = event.candidates[0] ?? 'none'
  const dayBucket = new Date().toISOString().slice(0, 10)
  const job = await emailCandidateVerifyQueue.add(event.type, event, {
    attempts,
    backoff: {
      type: 'exponential',
      delay: backoff,
    },
    removeOnComplete: 1000,
    removeOnFail: 1000,
    jobId: `email-verify:${event.organizationId}:${leadKey}:${primaryCandidate}:${dayBucket}`,
  })

  return job.id
}
