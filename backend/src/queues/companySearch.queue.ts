import { Queue, Worker, Job } from "bullmq";
import { config } from "@/config";
import * as companySearchService from "@/services/companySearch.service";
import logger from "@/lib/logger";

export enum CompanySearchEventType {
  PROCESS_COMPANY_SEARCH_JOB = "processCompanySearchJob",
}

export interface CompanySearchEvent {
  type: CompanySearchEventType;
  jobId: string;
}

export const COMPANY_SEARCH_QUEUE_NAME = "companySearch";

const redisConnection = {
  url: config.redis.url,
  ...(config.redis.useTLS && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

export const companySearchQueue = new Queue<CompanySearchEvent>(COMPANY_SEARCH_QUEUE_NAME, {
  connection: redisConnection,
});

export const addCompanySearchJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await companySearchQueue.add(
    CompanySearchEventType.PROCESS_COMPANY_SEARCH_JOB,
    {
      type: CompanySearchEventType.PROCESS_COMPANY_SEARCH_JOB,
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

  logger.info({ jobId }, "Company search job added to queue");
};

export const createCompanySearchWorker = () => {
  const worker = new Worker<CompanySearchEvent>(
    COMPANY_SEARCH_QUEUE_NAME,
    async (job: Job<CompanySearchEvent>) => {
      logger.info({ jobId: job.data.jobId, type: job.data.type }, "Processing company search queue job");

      switch (job.data.type) {
        case CompanySearchEventType.PROCESS_COMPANY_SEARCH_JOB:
          await companySearchService.processCompanySearchJob(job.data.jobId);
          break;
        default:
          logger.warn({ type: job.data.type }, "Unknown company search event type");
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.data.jobId }, "Company search queue job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.data.jobId, error: error.message },
      "Company search queue job failed"
    );
  });

  return worker;
};
