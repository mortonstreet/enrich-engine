import { Queue } from "bullmq";
import { config } from "@/config";

export enum EnrichmentEventType {
  PROCESS_BULK_JOB = "processBulkJob",
}

export interface EnrichmentEvent {
  type: EnrichmentEventType;
  jobId: string;
}

export const ENRICHMENT_QUEUE_NAME = "enrichment";

export const enrichmentQueue = new Queue<EnrichmentEvent>(
  ENRICHMENT_QUEUE_NAME,
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
);

export const addBulkEnrichmentJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000,
) => {
  await enrichmentQueue.add(
    EnrichmentEventType.PROCESS_BULK_JOB,
    {
      type: EnrichmentEventType.PROCESS_BULK_JOB,
      jobId,
    },
    {
      attempts,
      backoff: {
        type: "exponential",
        delay: backoff,
      },
    },
  );
};
