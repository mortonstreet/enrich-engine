import { Queue } from "bullmq";
import { config } from "@/config";

export enum ListEnrichmentEventType {
  PROCESS_LIST_JOB = "processListJob",
}

export interface ListEnrichmentEvent {
  type: ListEnrichmentEventType;
  jobId: string;
}

export const LIST_ENRICHMENT_QUEUE_NAME = "list-enrichment";

export const listEnrichmentQueue = new Queue<ListEnrichmentEvent>(
  LIST_ENRICHMENT_QUEUE_NAME,
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

export const addListEnrichmentJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await listEnrichmentQueue.add(
    ListEnrichmentEventType.PROCESS_LIST_JOB,
    {
      type: ListEnrichmentEventType.PROCESS_LIST_JOB,
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
};
