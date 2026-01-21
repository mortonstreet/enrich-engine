import { Queue } from "bullmq";
import { config } from "@/config";
import logger from "@/lib/logger";

export enum CopyGeneratorEventType {
  PROCESS_COPY_JOB = "processCopyJob",
}

export interface CopyGeneratorEvent {
  type: CopyGeneratorEventType;
  jobId: string;
}

export const COPY_GENERATOR_QUEUE_NAME = "copy-generator";

export const copyGeneratorQueue = new Queue<CopyGeneratorEvent>(
  COPY_GENERATOR_QUEUE_NAME,
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

export const addCopyGeneratorJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  logger.info(
    { jobId, queueName: COPY_GENERATOR_QUEUE_NAME, attempts, backoff },
    "copyGeneratorQueue: Adding job to queue"
  );

  const bullmqJob = await copyGeneratorQueue.add(
    CopyGeneratorEventType.PROCESS_COPY_JOB,
    {
      type: CopyGeneratorEventType.PROCESS_COPY_JOB,
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
    "copyGeneratorQueue: Job added to queue successfully"
  );

  return bullmqJob;
};
