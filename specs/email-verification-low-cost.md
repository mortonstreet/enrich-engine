# Low-Cost Email Verification and Ranking Spec

## 1. Objective
Build an in-house verification and ranking pipeline that:
- Cuts paid verification calls by 80% to 95%.
- Scales to tens of millions of candidate emails.
- Produces practical confidence buckets (`deliverable_high_confidence`, `risky_catch_all`, `undeliverable`, `unknown`).
- Integrates with existing enrichment flow in `backend/src/services/enrichment.service.ts` and `backend/src/services/emailGuess.service.ts`.

## 2. Problem Framing
Current waste driver:
- Per person, up to 6 guessed patterns are verified.
- Most checks are low-value misses.

Target strategy:
- Spend checks at the domain level first.
- Verify only top-ranked candidate emails for a subset of people.
- Cache aggressively and reuse pattern/domain intelligence.

## 3. Non-Goals
- 100% certainty on catch-all domains.
- Replacing every external verifier immediately.
- SMTP mailbox-content access (this design only validates acceptance behavior, not inbox ownership).

## 4. High-Level Architecture

### 4.1 Pipeline Stages
1. Candidate generation
- Use existing `EMAIL_PATTERNS` plus learned domain pattern.
- Generate max 6 local-part candidates but rank before verification.

2. Domain intelligence (run once per domain, cached)
- DNS checks: MX, fallback A/AAAA.
- SMTP handshake capability check (banner, `EHLO`, acceptance of `MAIL FROM`).
- Catch-all probe using random addresses.
- Domain risk signals (disposable provider list, parked/no-MX).

3. Candidate ranking
- Score each candidate from:
  - Domain pattern prior
  - Name normalization quality
  - Historical success for pattern@domain
  - Domain-level catch-all/risk state

4. Selective SMTP verification
- Verify only top candidate by default.
- Verify second candidate only if score is borderline and domain is non-catch-all.
- Skip per-email SMTP checks on domains classified as definitive catch-all; rely on ranking + external outcome feedback.

5. Outcome classification
- Save result as one of:
  - `deliverable_high_confidence`
  - `deliverable_medium_confidence`
  - `risky_catch_all`
  - `undeliverable`
  - `unknown_temp_failure`
  - `unknown_policy_blocked`

6. Continuous learning
- Feed campaign bounces and successful replies into domain-pattern priors.
- Retrain ranking thresholds weekly.

### 4.2 Why This Beats Naive 6x Verification
- Domain intelligence amortizes over all people in a company domain.
- Pattern learning turns one signal into many addresses.
- SMTP checks become targeted fallback, not default behavior.

## 5. Verification and Scoring Model

### 5.1 Raw Signal Interpretation
SMTP response categories:
- `250` on `RCPT TO` -> positive mailbox acceptance signal.
- `550/551/553` -> hard negative signal.
- `421/450/451/452` -> temporary/greylist signal (retry policy).
- timeout/connection refused -> infrastructure or policy unknown.

Domain states:
- `mx_present`: true/false
- `smtp_reachable`: true/false
- `catch_all_state`: `yes|no|suspected|unknown`

### 5.2 Confidence Score
`final_score` in range 0 to 100.

Proposed weighted components:
- `pattern_score` (0-35)
- `domain_health_score` (0-20)
- `smtp_signal_score` (-40 to +40)
- `historical_outcome_score` (-15 to +15)
- `risk_penalty` (0 to -20)

Initial bucket thresholds:
- `>= 80` -> `deliverable_high_confidence`
- `65-79` -> `deliverable_medium_confidence`
- `45-64` and catch-all -> `risky_catch_all`
- `< 45` with hard negative -> `undeliverable`
- otherwise -> `unknown_temp_failure` or `unknown_policy_blocked`

### 5.3 Retry Policy
- Hard negative SMTP: no retry.
- Temp failures: exponential retry up to 3 attempts across 24 hours.
- Policy blocks/timeouts: max 1 retry from a different worker/IP pool.

## 6. Data Model Changes (Prisma)
Add new backend-owned tables.

### 6.1 `EmailDomainProfile`
Purpose: amortized domain intelligence.

Fields:
- `id` UUID
- `domain` string (unique)
- `mxHosts` string[]
- `mxPresent` bool
- `smtpReachable` bool
- `catchAllState` string (`yes|no|suspected|unknown`)
- `lastProfiledAt` datetime
- `profileExpiresAt` datetime
- `sampleSize` int
- `acceptRate` decimal(5,4)
- `tempFailRate` decimal(5,4)
- `hardRejectRate` decimal(5,4)
- `createdAt`, `updatedAt`

Indexes:
- unique `(domain)`
- `(profileExpiresAt)`

### 6.2 `EmailPatternStats`
Purpose: per-domain pattern priors.

Fields:
- `id` UUID
- `domain` string
- `pattern` string (e.g. `first.last`)
- `successCount` int
- `failureCount` int
- `lastSuccessAt` datetime?
- `lastFailureAt` datetime?
- `confidence` decimal(5,4)
- `createdAt`, `updatedAt`

Indexes:
- unique `(domain, pattern)`
- `(domain, confidence)`

### 6.3 `EmailVerificationAttempt`
Purpose: auditable attempt-level telemetry.

Fields:
- `id` UUID
- `organizationId` string
- `leadId` string?
- `email` string
- `domain` string
- `attemptType` string (`domain_probe|candidate_verify`)
- `smtpHost` string?
- `smtpPort` int?
- `responseCode` string?
- `responseClass` string (`accept|hard_reject|temp_fail|timeout|blocked`)
- `latencyMs` int?
- `workerId` string?
- `ipPool` string?
- `resultStatus` string (final bucket)
- `costUnits` int @default(1)
- `createdAt`

Indexes:
- `(organizationId, createdAt desc)`
- `(domain, createdAt desc)`
- `(email, createdAt desc)`

### 6.4 Extend `LeadContactInfo`
Add optional fields:
- `verificationStatus` string?
- `verificationScore` decimal(5,2)?
- `verificationReason` string?
- `verificationLastCheckedAt` datetime?
- `verificationMethod` string? (`smtp|cache|vendor|inference`)

## 7. Queue and Worker Design (BullMQ)

### 7.1 New Queue Names
In `backend/src/types/queues.ts`:
- `EMAIL_DOMAIN_PROFILE = 'email-domain-profile'`
- `EMAIL_CANDIDATE_VERIFY = 'email-candidate-verify'`
- `EMAIL_VERIFY_RETRY = 'email-verify-retry'`

### 7.2 Job Types
1. `ProfileDomainJob`
- Input: `domain`
- Output: refreshed `EmailDomainProfile`

2. `VerifyLeadEmailJob`
- Input: `organizationId`, `leadId`, `domain`, ranked candidates
- Output: winning email + score + status

3. `RetryVerificationJob`
- Input: attempt id + retry window metadata
- Output: terminal status

### 7.3 Concurrency Controls
- Global worker concurrency: start at 20 per node.
- Per-domain lock: max 1 in-flight candidate verify per domain.
- Per-MX host rate cap: token bucket (e.g., 5 to 20/minute, adaptive).

### 7.4 Idempotency
Idempotency key examples:
- Domain profile: `domain:{domain}:{profile_window_start}`
- Candidate verify: `verify:{email}:{day_bucket}`

## 8. API/Service Contract Changes

### 8.1 Extend Existing Email Enrich Response
Update `EmailEnrichListResponse` with:
- `emailsVerifiedHighConfidence: number`
- `emailsVerifiedMediumConfidence: number`
- `emailsMarkedCatchAllRisk: number`
- `emailsMarkedUndeliverable: number`
- `emailsUnknown: number`

### 8.2 New Internal Service APIs
`emailVerification.service.ts`:
- `profileDomain(domain: string): Promise<EmailDomainProfile>`
- `rankCandidates(input): RankedCandidate[]`
- `verifyTopCandidate(input): VerificationDecision`
- `updatePatternStats(outcome): Promise<void>`

## 9. Cost and Scale Plan

### 9.1 Workload Example (Tens of Millions)
Given:
- 10M people
- naive 6 patterns each -> 60M checks

Optimized target:
- Domain profiling: 500k domains x avg 3 probes = 1.5M
- Per-person candidate SMTP checks on uncertain subset only (20%): 2.0M
- Retry overhead (~15% of uncertain subset): 0.3M
- Total ~3.8M checks instead of 60M (~93.7% reduction)

### 9.2 Throughput Target
- 3.8M checks/day ~= 44 checks/sec sustained.
- 3-node worker pool at 20 to 30 concurrent sockets each can support this if domain throttling is tuned.

### 9.3 Infra Cost Pattern
Expected cheap setup:
- 2 to 5 VPS worker nodes for SMTP/DNS probing.
- 1 app node + existing Postgres/Redis.

Cost drivers:
- Number of public IPv4 addresses.
- Failed/retried probes on hostile MX hosts.
- Ops time for blocklists and tuning.

Important: compute is cheap; healthy egress identity (IPs, reputation, and distribution) is the expensive part.

## 10. Deployment Guidance (VPS Question)

### 10.1 Does this require a VPS?
Not strictly, but for production-scale verification it effectively does.

Can run without VPS:
- Local/dev testing with small batches.

Production needs:
- Stable long-running worker processes.
- Reliable DNS + SMTP outbound connectivity.
- Multiple egress IPs for rate distribution.

### 10.2 Why serverless-only is a bad fit
- SMTP handshakes are socket-heavy and can be slow/variable.
- Many serverless runtimes have timeout/connectivity constraints.
- You need strict per-domain pacing and retry orchestration.

### 10.3 Practical baseline
- Start with 1 to 2 small VPS for pilot.
- Expand to 3 to 5 VPS + IP pool once volume and thresholds are calibrated.

## 11. Known Limitations
1. Catch-all domains cannot yield mailbox-level certainty.
2. Some MX providers tarpitting or policy blocks will keep a percentage in `unknown`.
3. False positives remain possible when SMTP accepts then later bounces.
4. Large burst traffic can degrade signal quality unless strict pacing is enforced.

## 12. Rollout Plan

### Phase 1 (1 to 2 weeks)
- Add domain profile table + worker.
- Add candidate ranking service with pattern priors.
- No direct SMTP candidate verification yet (domain-only signals).

Exit criteria:
- Domain profile cache hit rate > 70% on recurring runs.

### Phase 2 (1 to 2 weeks)
- Add selective top-candidate SMTP verification.
- Add verification statuses/scores on `LeadContactInfo`.
- Add retry queue for temp failures.

Exit criteria:
- 80%+ precision for `deliverable_high_confidence` bucket on validation sample.

### Phase 3 (ongoing)
- Ingest bounce/reply outcomes into `EmailPatternStats`.
- Tune thresholds and per-domain policies.
- Add optional paid fallback only for high-value unknowns.

Exit criteria:
- Total verification actions reduced by 80%+ vs baseline.
- Unknown bucket stable and measured.

## 13. Metrics and SLOs
Core metrics:
- `candidate_checks_per_lead`
- `domain_profile_cache_hit_rate`
- `% leads in each verification bucket`
- `hard_bounce_rate_by_bucket`
- `cost_units_per_high_confidence_email`
- `unknown_rate` by provider domain

Initial SLO targets:
- `deliverable_high_confidence` hard-bounce rate < 8%
- unknown rate < 25% on non-catch-all domains
- p95 verification latency < 8s for async pipeline

## 14. Security and Compliance
- Never store full SMTP transcripts containing unnecessary personal data.
- Log normalized response classes, not raw personal content.
- Honor suppression/unsubscribe/legal controls before campaign send.
- Rate-limit to avoid abusive probing patterns.

## 15. Immediate Implementation Checklist
1. Add Prisma models: `EmailDomainProfile`, `EmailPatternStats`, `EmailVerificationAttempt`.
2. Add new queue enums and worker scaffolding.
3. Create `emailVerification.service.ts` with ranking and classification logic.
4. Extend `EmailEnrichListResponse` and enrichment flow counters.
5. Add dashboard/report for bucket quality and cost-per-high-confidence-email.
