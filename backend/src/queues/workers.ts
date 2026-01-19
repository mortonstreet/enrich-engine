import { Worker } from "bullmq";
import { ExampleEvent, ExampleEventType, QueueName } from "@/types/queues";
import {
  EnrichmentEvent,
  EnrichmentEventType,
  ENRICHMENT_QUEUE_NAME,
} from "./enrichment.queue";
import {
  ListEnrichmentEvent,
  ListEnrichmentEventType,
  LIST_ENRICHMENT_QUEUE_NAME,
} from "./listEnrich.queue";
import {
  CopyGeneratorEvent,
  CopyGeneratorEventType,
  COPY_GENERATOR_QUEUE_NAME,
} from "./copyGenerator.queue";
import { config } from "@/config";
import { setRequestContext } from "@/lib/context";
import logger from "@/lib/logger";
import Sentry from "@/lib/sentry";
import * as enrichmentService from "@/services/enrichment.service";
import { processListEnrichmentJob } from "@/services/listEnrich.worker";
import { processCopyGeneratorJob } from "@/services/copyGenerator.worker";

export class EventProcessor {
  private worker: Worker<ExampleEvent>;

  constructor() {
    this.worker = new Worker<ExampleEvent>(
      QueueName.EXAMPLE,
      async (job) => {
        setRequestContext("jobId", job.id);
        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              `Received job with id: ${job.id} and data: ${JSON.stringify(job.data)}`,
            );

            switch (job.data.type) {
              case ExampleEventType.GET_EXAMPLE:
                logger.info("Processing example event", job.data.id);
                break;
              default:
                throw new Error(`Unknown event type: ${job.data.type}`);
            }
          });
        } catch (error) {
          logger.error({ error, jobId: job.id }, "Failed to process event");
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              jobData: job.data,
            },
          });
          throw error; // Re-throw to let BullMQ handle the failure
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
      },
    );
  }

  async close() {
    await this.worker.close();
  }
}

export class EnrichmentProcessor {
  private worker: Worker<EnrichmentEvent>;

  constructor() {
    this.worker = new Worker<EnrichmentEvent>(
      ENRICHMENT_QUEUE_NAME,
      async (job) => {
        setRequestContext("jobId", job.id);
        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              { jobId: job.id, enrichmentJobId: job.data.jobId },
              "Processing enrichment job",
            );

            switch (job.data.type) {
              case EnrichmentEventType.PROCESS_BULK_JOB:
                await enrichmentService.processBulkJob(job.data.jobId);
                break;
              default:
                throw new Error(
                  `Unknown enrichment event type: ${job.data.type}`,
                );
            }
          });
        } catch (error) {
          logger.error(
            { error, jobId: job.id },
            "Failed to process enrichment job",
          );
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              jobData: job.data,
            },
          });
          throw error;
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
      },
    );
  }

  async close() {
    await this.worker.close();
  }
}

export class ListEnrichmentProcessor {
  private worker: Worker<ListEnrichmentEvent>;

  constructor() {
    this.worker = new Worker<ListEnrichmentEvent>(
      LIST_ENRICHMENT_QUEUE_NAME,
      async (job) => {
        setRequestContext("jobId", job.id);
        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              { jobId: job.id, listEnrichmentJobId: job.data.jobId },
              "Processing list enrichment job"
            );

            switch (job.data.type) {
              case ListEnrichmentEventType.PROCESS_LIST_JOB:
                await processListEnrichmentJob(job.data.jobId);
                break;
              default:
                throw new Error(
                  `Unknown list enrichment event type: ${job.data.type}`
                );
            }
          });
        } catch (error) {
          logger.error(
            { error, jobId: job.id },
            "Failed to process list enrichment job"
          );
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              jobData: job.data,
            },
          });
          throw error;
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
      }
    );
  }

  async close() {
    await this.worker.close();
  }
}

export class CopyGeneratorProcessor {
  private worker: Worker<CopyGeneratorEvent>;

  constructor() {
    this.worker = new Worker<CopyGeneratorEvent>(
      COPY_GENERATOR_QUEUE_NAME,
      async (job) => {
        setRequestContext("jobId", job.id);
        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              { jobId: job.id, copyGeneratorJobId: job.data.jobId },
              "Processing copy generator job"
            );

            switch (job.data.type) {
              case CopyGeneratorEventType.PROCESS_COPY_JOB:
                await processCopyGeneratorJob(job.data.jobId);
                break;
              default:
                throw new Error(
                  `Unknown copy generator event type: ${job.data.type}`
                );
            }
          });
        } catch (error) {
          logger.error(
            { error, jobId: job.id },
            "Failed to process copy generator job"
          );
          Sentry.captureException(error, {
            extra: {
              jobId: job.id,
              jobName: job.name,
              jobData: job.data,
            },
          });
          throw error;
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
      }
    );
  }

  async close() {
    await this.worker.close();
  }
}
