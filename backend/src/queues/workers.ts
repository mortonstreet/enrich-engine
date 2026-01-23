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
import {
  HybridVerificationEvent,
  HybridVerificationEventType,
  HYBRID_VERIFICATION_QUEUE_NAME,
} from "./hybridVerification.queue";
import { config } from "@/config";
import { setRequestContext } from "@/lib/context";
import logger from "@/lib/logger";
import Sentry from "@/lib/sentry";
import * as enrichmentService from "@/services/enrichment.service";
import { processListEnrichmentJob } from "@/services/listEnrich.worker";
import { processCopyGeneratorJob } from "@/services/copyGenerator.worker";
import {
  processSmtpVerification,
  processUserDecision,
  processApiVerification,
} from "@/services/hybridVerification.worker";

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
    logger.info(
      { queueName: COPY_GENERATOR_QUEUE_NAME, redisUrl: config.redis.url?.substring(0, 30) + "..." },
      "CopyGeneratorProcessor: Initializing worker"
    );

    this.worker = new Worker<CopyGeneratorEvent>(
      COPY_GENERATOR_QUEUE_NAME,
      async (job) => {
        setRequestContext("jobId", job.id);
        logger.info(
          {
            bullmqJobId: job.id,
            bullmqJobName: job.name,
            copyGeneratorJobId: job.data.jobId,
            eventType: job.data.type,
          },
          "CopyGeneratorProcessor: Received job from queue"
        );

        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              { jobId: job.id, copyGeneratorJobId: job.data.jobId },
              "CopyGeneratorProcessor: Starting job processing"
            );

            switch (job.data.type) {
              case CopyGeneratorEventType.PROCESS_COPY_JOB:
                await processCopyGeneratorJob(job.data.jobId);
                logger.info(
                  { jobId: job.id, copyGeneratorJobId: job.data.jobId },
                  "CopyGeneratorProcessor: Job processing completed successfully"
                );
                break;
              default:
                throw new Error(
                  `Unknown copy generator event type: ${job.data.type}`
                );
            }
          });
        } catch (error) {
          logger.error(
            { error, jobId: job.id, copyGeneratorJobId: job.data.jobId },
            "CopyGeneratorProcessor: Failed to process copy generator job"
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

    // Listen to worker events for debugging
    this.worker.on("ready", () => {
      logger.info("CopyGeneratorProcessor: Worker is ready and listening for jobs");
    });

    this.worker.on("error", (error) => {
      logger.error({ error }, "CopyGeneratorProcessor: Worker encountered an error");
    });

    this.worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error },
        "CopyGeneratorProcessor: Job failed"
      );
    });

    this.worker.on("completed", (job) => {
      logger.info(
        { jobId: job?.id },
        "CopyGeneratorProcessor: Job completed"
      );
    });
  }

  async close() {
    logger.info("CopyGeneratorProcessor: Closing worker");
    await this.worker.close();
  }
}

export class HybridVerificationProcessor {
  private worker: Worker<HybridVerificationEvent>;

  constructor() {
    logger.info(
      { queueName: HYBRID_VERIFICATION_QUEUE_NAME, redisUrl: config.redis.url?.substring(0, 30) + "..." },
      "HybridVerificationProcessor: Initializing worker"
    );

    this.worker = new Worker<HybridVerificationEvent>(
      HYBRID_VERIFICATION_QUEUE_NAME,
      async (job) => {
        setRequestContext("jobId", job.id);
        logger.info(
          {
            bullmqJobId: job.id,
            bullmqJobName: job.name,
            verificationJobId: job.data.jobId,
            eventType: job.data.type,
          },
          "HybridVerificationProcessor: Received job from queue"
        );

        try {
          await Sentry.withScope(async (scope) => {
            scope.setContext("job", {
              id: job.id,
              name: job.name,
              data: job.data,
            });

            logger.info(
              { jobId: job.id, verificationJobId: job.data.jobId },
              "HybridVerificationProcessor: Starting job processing"
            );

            switch (job.data.type) {
              case HybridVerificationEventType.START_SMTP_VERIFICATION:
                await processSmtpVerification(job.data.jobId);
                logger.info(
                  { jobId: job.id, verificationJobId: job.data.jobId },
                  "HybridVerificationProcessor: SMTP verification completed"
                );
                break;
              case HybridVerificationEventType.APPLY_DECISION:
                if (!job.data.decision) {
                  throw new Error("Decision is required for APPLY_DECISION event");
                }
                await processUserDecision(job.data.jobId, job.data.decision as any);
                logger.info(
                  { jobId: job.id, verificationJobId: job.data.jobId, decision: job.data.decision },
                  "HybridVerificationProcessor: Decision applied"
                );
                break;
              case HybridVerificationEventType.PROCESS_API_VERIFICATION:
                await processApiVerification(job.data.jobId);
                logger.info(
                  { jobId: job.id, verificationJobId: job.data.jobId },
                  "HybridVerificationProcessor: API verification completed"
                );
                break;
              default:
                throw new Error(
                  `Unknown hybrid verification event type: ${job.data.type}`
                );
            }
          });
        } catch (error) {
          logger.error(
            { error, jobId: job.id, verificationJobId: job.data.jobId },
            "HybridVerificationProcessor: Failed to process verification job"
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

    // Listen to worker events for debugging
    this.worker.on("ready", () => {
      logger.info("HybridVerificationProcessor: Worker is ready and listening for jobs");
    });

    this.worker.on("error", (error) => {
      logger.error({ error }, "HybridVerificationProcessor: Worker encountered an error");
    });

    this.worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error },
        "HybridVerificationProcessor: Job failed"
      );
    });

    this.worker.on("completed", (job) => {
      logger.info(
        { jobId: job?.id },
        "HybridVerificationProcessor: Job completed"
      );
    });
  }

  async close() {
    logger.info("HybridVerificationProcessor: Closing worker");
    await this.worker.close();
  }
}
