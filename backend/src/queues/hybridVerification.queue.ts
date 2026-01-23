import { Queue } from "bullmq";
import { config } from "@/config";

export enum HybridVerificationEventType {
  START_SMTP_VERIFICATION = "startSmtpVerification",
  APPLY_DECISION = "applyDecision",
  PROCESS_API_VERIFICATION = "processApiVerification",
}

export interface HybridVerificationEvent {
  type: HybridVerificationEventType;
  jobId: string;
  decision?: string;
}

export const HYBRID_VERIFICATION_QUEUE_NAME = "hybrid-verification";

export const hybridVerificationQueue = new Queue<HybridVerificationEvent>(
  HYBRID_VERIFICATION_QUEUE_NAME,
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

export const addSmtpVerificationJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await hybridVerificationQueue.add(
    HybridVerificationEventType.START_SMTP_VERIFICATION,
    {
      type: HybridVerificationEventType.START_SMTP_VERIFICATION,
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

export const addApplyDecisionJob = async (
  jobId: string,
  decision: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await hybridVerificationQueue.add(
    HybridVerificationEventType.APPLY_DECISION,
    {
      type: HybridVerificationEventType.APPLY_DECISION,
      jobId,
      decision,
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

export const addApiVerificationJob = async (
  jobId: string,
  attempts: number = 3,
  backoff: number = 5000
) => {
  await hybridVerificationQueue.add(
    HybridVerificationEventType.PROCESS_API_VERIFICATION,
    {
      type: HybridVerificationEventType.PROCESS_API_VERIFICATION,
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
