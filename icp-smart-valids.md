# Enrich Engine Optimization Plan

## Overview
Redesign the enrichment pipeline to reduce costs, eliminate duplicate enrichments, and add multi-column AI personalization with ICP context.

---

## Phase 1: Fix Connection Pool Issue (Critical)

**Problem**: `MaxClientsInSessionMode: max clients reached` - Supabase Session mode limits connections.

**File**: `/backend/src/lib/db.ts`

**Change**:
```typescript
const dialect = new PostgresDialect({
  pool: new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    max: 5,                    // Reduced from 20
    idleTimeoutMillis: 30000,  // Close idle connections
    connectionTimeoutMillis: 10000,
  }),
});
```

**Alternative**: Switch to Supabase Transaction mode (port 6543) which allows higher connection limits.

---

## Phase 2: Org-Wide Enrichment Deduplication

**Goal**: Never re-enrich the same contact. Store all enriched contacts in a master table.

### Schema Addition (Prisma)

Add to `schema.prisma`:

```prisma
model EnrichedContact {
  id              String   @id @default(uuid())
  organizationId  String
  linkedinUrl     String?  // Primary dedup key (normalized)
  emailNormalized String?  // Secondary dedup key
  nameHash        String?  // MD5 hash of firstName+lastName+company

  firstName       String?
  lastName        String?
  email           String?
  phone           String?
  company         String?
  companyDomain   String?
  role            String?
  emailPattern    String?  // Pattern that worked
  emailSource     String?  // "guessed", "prospeo", "imported"
  enrichedAt      DateTime @default(now())

  // ICP fields
  icpScore        Float?
  icpContext      Json?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, linkedinUrl])
  @@index([organizationId, emailNormalized])
  @@index([organizationId, nameHash])
  @@map("enriched_contact")
}
```

### New Repository

Create `/backend/src/repositories/enrichedContact.repository.ts`:
- `findByLinkedinUrl(orgId, linkedinUrl)` - Check if already enriched
- `findExistingContacts(orgId, linkedinUrls[])` - Batch dedup check
- `upsert(data)` - Create or update enriched contact

### Integration

Modify `/backend/src/services/listEnrich.worker.ts`:
1. Before processing, call `findExistingContacts()` with all LinkedIn URLs
2. Skip leads that already exist in master table
3. Copy cached email/phone to lead directly (free "enrichment")
4. Only process truly new contacts
5. After successful enrichment, upsert to `EnrichedContact`

---

## Phase 3: Email Validation Cost Reduction

**Problem**: 6000 validations yield 400 valid (6.6% hit rate). All 6 patterns validated upfront.

**Solution**: Sequential waterfall with pattern caching.

### Strategy

1. **Known Pattern First**: If domain has a known pattern with >50% success rate, try ONLY that pattern
2. **Sequential Validation**: For unknown domains, try patterns one-by-one (highest hit rate first), stop on first valid
3. **Bulk Fallback**: Only use bulk validation when necessary

### Pattern Priority (from codebase data)
1. `first` - 21% hit rate
2. `flast` - 10% hit rate
3. `first.last` - 7.5% hit rate
4. `firstl` - 2.4% hit rate
5. `firstlast` - 1.1% hit rate
6. `last` - 1% hit rate

### New Service

Create `/backend/src/services/smartEmailValidation.service.ts`:

```typescript
interface ValidationResult {
  email: string | null;
  pattern: string | null;
  creditsUsed: number;
  source: "cached_pattern" | "sequential" | "bulk";
}

async function smartValidateEmail(
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string
): Promise<ValidationResult>
```

**Logic**:
1. Check `DomainEmailPattern` for known patterns
2. If confidence >70%, generate only that pattern, validate once
3. If unknown, iterate patterns sequentially - stop on first valid/catch_all
4. Record success/failure in `DomainEmailPattern` for learning

### Real-time Validation Client

Create `/backend/src/clients/millionverifier.realtime.client.ts`:
- Single email validation endpoint (for sequential approach)
- Used when testing patterns one at a time

### Worker Changes

Modify `/backend/src/services/listEnrich.worker.ts`:
1. Group leads by domain knowledge (known vs unknown patterns)
2. Known patterns: Generate 1 email per lead, bulk validate (cheap)
3. Unknown patterns: Use sequential validation per lead
4. **Expected savings**: ~62% reduction in validation credits

---

## Phase 4: ICP Classification System

**Goal**: Score leads against ideal customer profile using AI web research. Built directly in enrich-engine with user-provided prompts.

### Schema Changes

Add to `Lead` model:
```prisma
model Lead {
  // ... existing fields
  icpScore        Float?
  icpContext      Json?      // Company insights, personalization hooks
  icpClassifiedAt DateTime?
}
```

Add new job model for ICP classification:
```prisma
model IcpClassificationJob {
  id              String    @id @default(uuid())
  organizationId  String
  userId          String
  listId          String
  userPrompt      String    @db.Text  // User's ICP criteria/instructions
  status          String    @default("pending")
  totalRows       Int
  processedRows   Int       @default(0)
  successCount    Int       @default(0)
  errorCount      Int       @default(0)
  tokensUsed      Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime?

  @@index([organizationId])
  @@index([listId])
  @@map("icp_classification_job")
}
```

### User Prompt Interface

Users define their ICP criteria via a prompt, for example:
```
"My ideal customer is a B2B SaaS company with 50-500 employees,
Series A-C funded, using modern tech stack (React, Node, AWS).
They should have a VP of Engineering or CTO who posts about
scaling challenges. Red flags: consulting firms, agencies,
companies with no recent LinkedIn activity."
```

### ICP Context Structure (AI Output)

```typescript
interface ICPContext {
  companyInsights: {
    industry?: string;
    size?: string;
    techStack?: string[];
    recentNews?: string[];
    fundingStage?: string;
    websiteAnalysis?: string;
  };
  personInsights: {
    recentActivity?: string[];
    interests?: string[];
    postingFrequency?: string;
  };
  fitAnalysis: {
    score: number;  // 0-100
    reasons: string[];      // Why they're a good fit
    concerns: string[];     // Red flags
    personalizationHooks: string[];  // Specific things to mention in outreach
  };
}
```

### Web Research Flow

1. **Company Research**:
   - Scrape company website (landing page, about, careers)
   - Extract tech stack signals, company size, industry
   - Use Serper to find recent news/funding

2. **Person Research**:
   - LinkedIn profile analysis (via Serper search)
   - Recent post topics and engagement

3. **AI Scoring**:
   - Feed all context + user's ICP prompt to OpenRouter
   - AI returns structured `ICPContext` with score and hooks

### Service

Create `/backend/src/services/icpClassification.service.ts`:
- `classifyLead(leadId, userPrompt, apiKey)` - Analyze single lead
- `createJob(listId, userPrompt)` - Create batch classification job
- Web research helpers: `scrapeCompanyWebsite()`, `searchPersonLinkedIn()`
- Uses OpenRouter for AI analysis
- Stores results in `Lead.icpContext` and `EnrichedContact.icpContext`

### Worker

Create `/backend/src/services/icpClassification.worker.ts`:
- Process leads in batches of 10 (web research is slow)
- Rate limit external requests
- Real-time progress via Pusher

### API Endpoints

```
POST /api/icp-classification/jobs - Create job with user prompt
GET  /api/icp-classification/jobs - List jobs
GET  /api/icp-classification/jobs/:id - Get job details
POST /api/icp-classification/preview - Preview single lead (useful for testing prompts)
```

---

## Phase 5: Multi-Column AI Personalization

**Goal**: Generate multiple personalized columns per lead for drip sequences.

### Schema Changes

Add columns to `Lead`:
```prisma
model Lead {
  // ... existing fields
  subject            String?   // Email subject
  openingParagraph   String?   // First paragraph
  followUp1          String?   // Follow-up 1 content
  followUp2          String?   // Follow-up 2 content
  followUp3          String?   // Follow-up 3 content
  callToAction       String?   // CTA
  personalizedFields Json?     // Flexible custom columns
}
```

### Types

Add `/shared/types/src/requests/personalization.ts`:
```typescript
type PersonalizationColumnType =
  | "subject" | "firstLine" | "openingParagraph"
  | "followUp1" | "followUp2" | "followUp3"
  | "callToAction" | "custom";

interface ColumnConfig {
  columnType: PersonalizationColumnType;
  columnName: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

interface CreatePersonalizationJobRequest {
  listId: string;
  columns: ColumnConfig[];  // 1-10 columns
  useIcpContext: boolean;
}
```

### Extended OpenRouter Client

Add to `/backend/src/clients/openrouter.client.ts`:
- `generateColumn(lead, columnConfig, apiKey)` - Generate single column
- `generateAllColumns(lead, columns[], useIcpContext, apiKey)` - Generate all columns for a lead

### Column-Specific System Prompts

```typescript
const COLUMN_PROMPTS = {
  subject: "Write a compelling 60-char email subject line...",
  firstLine: "Write a personalized first line under 20 words...",
  openingParagraph: "Write 2-3 sentence opening paragraph...",
  followUp1: "Write follow-up #1 (3 days after)...",
  followUp2: "Write follow-up #2 (1 week after)...",
  followUp3: "Write break-up email (final follow-up)...",
  callToAction: "Write a low-commitment CTA...",
};
```

### Service & Worker

Extend existing copy generator pattern:
- `/backend/src/services/personalization.service.ts`
- `/backend/src/services/personalization.worker.ts`
- Use existing BullMQ queue infrastructure
- Batch process 50 leads at a time
- Use ICP context from Phase 4 to enrich prompts

### API Endpoints

```
POST /api/personalization/jobs - Create multi-column job
GET  /api/personalization/jobs - List jobs
GET  /api/personalization/jobs/:id - Get job details
POST /api/personalization/preview - Preview single lead
```

---

## Implementation Order

1. **Phase 1**: Connection pool fix (immediate - unblocks testing)
2. **Phase 2**: Schema migration + `EnrichedContact` repository
3. **Phase 3**: Smart email validation (biggest cost savings)
4. **Phase 4**: ICP classification service
5. **Phase 5**: Multi-column personalization

---

## Files to Create/Modify

### New Files
- `/backend/src/repositories/enrichedContact.repository.ts`
- `/backend/src/services/smartEmailValidation.service.ts`
- `/backend/src/clients/millionverifier.realtime.client.ts`
- `/backend/src/services/icpClassification.service.ts`
- `/backend/src/services/icpClassification.worker.ts`
- `/backend/src/controllers/icpClassification.controller.ts`
- `/backend/src/routes/icpClassification.ts`
- `/backend/src/services/personalization.service.ts`
- `/backend/src/services/personalization.worker.ts`
- `/backend/src/controllers/personalization.controller.ts`
- `/backend/src/routes/personalization.ts`
- `/shared/types/src/requests/personalization.ts`
- `/shared/types/src/requests/icpClassification.ts`
- `/frontend/hooks/api/usePersonalization.ts`
- `/frontend/hooks/api/useIcpClassification.ts`

### Modified Files
- `/backend/src/lib/db.ts` - Connection pool settings
- `/shared/db/prisma/schema.prisma` - New models and fields
- `/backend/src/services/listEnrich.worker.ts` - Dedup + smart validation
- `/backend/src/clients/openrouter.client.ts` - Multi-column generation
- `/backend/src/repositories/domainPattern.repository.ts` - Better integration

---

## Verification

1. **Connection Pool**: Load test with 50 concurrent enrichment jobs - no "max clients" errors
2. **Deduplication**: Re-run enrichment on same list - 0 API credits used
3. **Email Validation**: Track `validationCredits` before/after - expect 60%+ reduction
4. **ICP Classification**: Verify `icpScore` and `icpContext` populated on leads
5. **Personalization**: Generate job with 5 columns - verify all columns populated
