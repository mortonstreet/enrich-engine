import { Queue } from "bullmq";
import { config } from "@/config";
import logger from "@/lib/logger";

export enum PersonalizationEventType {
  PROCESS_PERSONALIZATION_JOB = "processPersonalizationJob",
}

export interface PersonalizationEvent {
  type: PersonalizationEventType;
  jobId: string;
}

export const PERSONALIZATION_QUEUE_NAME = "personalization";

export const personalizationQueue = new Queue<PersonalizationEvent>(
  PERSONALIZATION_QUEUE_NAME,
  {
    connection: {
      url: config.redis.url,
      ...(config.redis.useTLS && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    },
  }
);

export const addPersonalizationJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  logger.info(
    { jobId, queueName: PERSONALIZATION_QUEUE_NAME, attempts, backoff },
    "personalizationQueue: Adding job to queue"
  );

  const bullmqJob = await personalizationQueue.add(
    PersonalizationEventType.PROCESS_PERSONALIZATION_JOB,
    {
      type: PersonalizationEventType.PROCESS_PERSONALIZATION_JOB,
      jobId,
    },
    {
      attempts,
      backoff: {
        type: "exponential",
        delay: backoff,
      },
    }
  );

  logger.info(
    { jobId, bullmqJobId: bullmqJob.id, bullmqJobName: bullmqJob.name },
    "personalizationQueue: Job added to queue successfully"
  );

  return bullmqJob;
};
