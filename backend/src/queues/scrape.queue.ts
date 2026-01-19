import { Queue, Worker, Job } from "bullmq";
import { config } from "@/config";
import * as scrapeService from "@/services/scrape.service";
import logger from "@/lib/logger";

export enum ScrapeEventType {
  PROCESS_SCRAPE_JOB = "processScrapeJob",
}

export interface ScrapeEvent {
  type: ScrapeEventType;
  jobId: string;
}

export const SCRAPE_QUEUE_NAME = "scrape";

const redisConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

export const scrapeQueue = new Queue<ScrapeEvent>(SCRAPE_QUEUE_NAME, {
  connection: redisConnection,
});

export const addScrapeJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await scrapeQueue.add(
    ScrapeEventType.PROCESS_SCRAPE_JOB,
    {
      type: ScrapeEventType.PROCESS_SCRAPE_JOB,
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

  logger.info({ jobId }, "Scrape job added to queue");
};

export const createScrapeWorker = () => {
  const worker = new Worker<ScrapeEvent>(
    SCRAPE_QUEUE_NAME,
    async (job: Job<ScrapeEvent>) => {
      logger.info({ jobId: job.data.jobId, type: job.data.type }, "Processing scrape queue job");

      switch (job.data.type) {
        case ScrapeEventType.PROCESS_SCRAPE_JOB:
          await scrapeService.processScrapeJob(job.data.jobId);
          break;
        default:
          logger.warn({ type: job.data.type }, "Unknown scrape event type");
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.data.jobId }, "Scrape queue job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.data.jobId, error: error.message },
      "Scrape queue job failed"
    );
  });

  return worker;
};
