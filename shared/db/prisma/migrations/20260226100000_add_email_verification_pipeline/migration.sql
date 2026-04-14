-- @wave1-safe: yes
-- @lock-risk: low
-- @dry-run-required: yes

-- Add verification metadata to lead contact info
ALTER TABLE "lead_contact_info"
  ADD COLUMN "verificationStatus" TEXT,
  ADD COLUMN "verificationScore" DECIMAL(5,2),
  ADD COLUMN "verificationReason" TEXT,
  ADD COLUMN "verificationLastCheckedAt" TIMESTAMP(3),
  ADD COLUMN "verificationMethod" TEXT;

-- Domain-level verification profile cache
CREATE TABLE "email_domain_profile" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "mxHosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mxPresent" BOOLEAN NOT NULL DEFAULT false,
  "smtpReachable" BOOLEAN NOT NULL DEFAULT false,
  "catchAllState" TEXT NOT NULL DEFAULT 'unknown',
  "lastProfiledAt" TIMESTAMP(3),
  "profileExpiresAt" TIMESTAMP(3) NOT NULL,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "acceptRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "tempFailRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "hardRejectRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_domain_profile_pkey" PRIMARY KEY ("id")
);

-- Per-domain pattern confidence
CREATE TABLE "email_pattern_stats" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "confidence" DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_pattern_stats_pkey" PRIMARY KEY ("id")
);

-- Attempt-level verification telemetry
CREATE TABLE "email_verification_attempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT,
  "email" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "attemptType" TEXT NOT NULL,
  "smtpHost" TEXT,
  "smtpPort" INTEGER,
  "responseCode" TEXT,
  "responseClass" TEXT,
  "latencyMs" INTEGER,
  "workerId" TEXT,
  "ipPool" TEXT,
  "resultStatus" TEXT,
  "costUnits" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_attempt_pkey" PRIMARY KEY ("id")
);

-- @allow-non-concurrent-index
CREATE UNIQUE INDEX "email_domain_profile_domain_key"
  ON "email_domain_profile"("domain");

-- @allow-non-concurrent-index
CREATE INDEX "email_domain_profile_profileExpiresAt_idx"
  ON "email_domain_profile"("profileExpiresAt");

-- @allow-non-concurrent-index
CREATE UNIQUE INDEX "email_pattern_stats_domain_pattern_key"
  ON "email_pattern_stats"("domain", "pattern");

-- @allow-non-concurrent-index
CREATE INDEX "email_pattern_stats_domain_confidence_idx"
  ON "email_pattern_stats"("domain", "confidence");

-- @allow-non-concurrent-index
CREATE INDEX "email_verification_attempt_organizationId_createdAt_idx"
  ON "email_verification_attempt"("organizationId", "createdAt" DESC);

-- @allow-non-concurrent-index
CREATE INDEX "email_verification_attempt_domain_createdAt_idx"
  ON "email_verification_attempt"("domain", "createdAt" DESC);

-- @allow-non-concurrent-index
CREATE INDEX "email_verification_attempt_email_createdAt_idx"
  ON "email_verification_attempt"("email", "createdAt" DESC);

-- @allow-non-concurrent-index
CREATE INDEX "lead_contact_info_verificationStatus_verificationLastCheckedAt_idx"
  ON "lead_contact_info"("verificationStatus", "verificationLastCheckedAt");

-- RLS enabled as backend-owned tables (no policies)
ALTER TABLE "email_domain_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_pattern_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_verification_attempt" ENABLE ROW LEVEL SECURITY;
