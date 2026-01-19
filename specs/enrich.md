# Enrich Feature Spec

**Module Owner:** This session
**Status:** Not Started
**Dependencies:** lists.md (reads lists for enrichment)

---

## Implementation Status

### Features
- [ ] List selector dropdown (shows all lists from Lists tab)
- [ ] Enrichment type selection (Email OR Phone)
- [ ] LinkedIn column auto-detection
- [ ] Prospeo API integration
- [ ] Background queue processing (BullMQ)
- [ ] Real-time progress updates
- [ ] Update leads with enriched data
- [ ] Job history table
- [ ] Download enriched results
- [ ] Vendor API key management (admin only)

### Key Files (TBD)
**Database:**
- `shared/db/prisma/schema.prisma` - EnrichmentJob, VendorApiKey models

**Backend:**
- `backend/src/api/routes/enrich.ts`
- `backend/src/api/controllers/enrich.controller.ts`
- `backend/src/services/enrich.service.ts`
- `backend/src/repositories/enrichmentJob.repository.ts`
- `backend/src/repositories/vendorApiKey.repository.ts`
- `backend/src/clients/prospeo.client.ts`
- `backend/src/queues/enrich.queue.ts`
- `backend/src/workers/enrich.worker.ts`

**Frontend:**
- `frontend/app/dashboard/enrich/page.tsx`
- `frontend/components/enrich/EnrichForm.tsx`
- `frontend/components/enrich/EnrichJobCard.tsx`
- `frontend/components/enrich/EnrichJobsTable.tsx`
- `frontend/app/dashboard/settings/api-keys/page.tsx`
- `frontend/hooks/api/useEnrich.ts`

---

## Overview

The Enrich feature provides multi-vendor enrichment API integration, starting with Prospeo. Users select a list from the Lists tab, choose an enrichment type (Email or Phone), and the system enriches all records with LinkedIn URLs.

### User Flow

1. User navigates to Enrich tab
2. Selects a list from dropdown (shows all lists from Lists tab)
3. System auto-detects `linkedin_url` column
4. User chooses enrichment type: **Email** OR **Phone**
5. User starts enrichment job
6. Background worker processes each lead:
   - Calls Prospeo API with LinkedIn URL
   - Updates lead record with enriched data
7. Real-time progress updates shown
8. On completion: User can download enriched CSV

### Admin Flow (API Key Setup)

1. Admin navigates to Settings > API Keys
2. Enters Prospeo API key
3. System encrypts and stores key
4. Key is used for all enrichment jobs in the organization

---

## Requirements

### 1. List Selection

**Dropdown shows:**
- All lists from Lists tab
- List name and lead count
- Source indicator (Uploaded / Scraped)
- Excludes folders

**Validation:**
- Selected list must contain `linkedin_url` or `linkedin` column
- If not found: Show error "List must contain LinkedIn URLs"

### 2. Enrichment Types (per Prospeo docs)

| Type | Prospeo Endpoint | Input | Output |
|------|------------------|-------|--------|
| Email | `/linkedin-email-finder` | LinkedIn URL | Verified email address |
| Phone | `/mobile-finder` | LinkedIn URL | Mobile phone number |

User selects ONE type per job (Email OR Phone, not both).

### 3. Vendor API Key Management

**Storage:**
- Encrypted with AES-256
- Stored per organization
- Admin-only access to view/edit

**UI (Settings > API Keys):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  API Keys                                                                   │
│  Configure vendor API keys for enrichment                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Prospeo                                                      [Connected ✓]│
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ••••••••••••••••••••••••                              [Update] [Remove]│ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Apollo (Coming Soon)                                         [Not Set]    │
│  Hunter (Coming Soon)                                         [Not Set]    │
│  Clearbit (Coming Soon)                                       [Not Set]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Enrich Page Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Enrich                                                                     │
│  Get emails and phone numbers from LinkedIn profiles                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Select a list                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Choose a list...                                                    ▼ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ Q1 Tech Leads ─────────────────────────────────────────────────────────┐│
│  │ 📊 150 leads  •  🔗 LinkedIn column detected  •  📥 Scraped           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Enrichment type                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │ ○ Email             │  │ ○ Phone             │                          │
│  │   Find verified     │  │   Find mobile       │                          │
│  │   email addresses   │  │   phone numbers     │                          │
│  └─────────────────────┘  └─────────────────────┘                          │
│                                                                             │
│                                                      [Start Enrichment]    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Recent Jobs                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  | List           | Type  | Status     | Progress | Success | Created     |│
│  |----------------|-------|------------|----------|---------|-------------|│
│  | Q1 Tech Leads  | Email | Completed  | 150/150  | 142     | 2 hours ago |│
│  | Sales Targets  | Phone | Processing | 45/200   | 40      | 10 min ago  |│
│  | CEOs List      | Email | Failed     | 20/50    | 15      | Yesterday   |│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Job Progress Card
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sales Targets - Email Enrichment                              [Download]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%                              │
│                                                                             │
│  Processing lead 45 of 200                                                 │
│                                                                             │
│  ✓ 40 enriched  •  ✗ 5 not found  •  💳 40 credits used                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### No API Key Warning
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  No Prospeo API Key                                                    │
│                                                                             │
│  To use enrichment, an admin must configure the Prospeo API key in         │
│  Settings > API Keys.                                                       │
│                                                                             │
│                                                     [Go to Settings]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Enrichment Jobs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/enrich/jobs` | Create enrichment job |
| GET | `/enrich/jobs` | List user's enrichment jobs |
| GET | `/enrich/jobs/:id` | Get job status/progress |
| GET | `/enrich/jobs/:id/download` | Download enriched CSV |
| DELETE | `/enrich/jobs/:id` | Cancel/delete job |

### Vendors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/enrich/vendors` | List available vendors (with key status) |

### API Keys (Admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/org/settings/api-keys` | List configured API keys (masked) |
| POST | `/org/settings/api-keys` | Save vendor API key |
| DELETE | `/org/settings/api-keys/:vendor` | Remove vendor API key |

### POST /enrich/jobs

**Request:**
```json
{
  "listId": "list_123",
  "enrichmentType": "email"
}
```

**Response:**
```json
{
  "id": "job_456",
  "listId": "list_123",
  "listName": "Q1 Tech Leads",
  "vendor": "prospeo",
  "enrichmentType": "email",
  "status": "pending",
  "totalRows": 150,
  "processedRows": 0,
  "successCount": 0,
  "errorCount": 0,
  "creditsUsed": 0,
  "createdAt": "2026-01-18T10:00:00Z"
}
```

### GET /enrich/vendors

**Response:**
```json
{
  "vendors": [
    {
      "id": "prospeo",
      "name": "Prospeo",
      "isConfigured": true,
      "supportedTypes": ["email", "phone"],
      "status": "active"
    },
    {
      "id": "apollo",
      "name": "Apollo",
      "isConfigured": false,
      "supportedTypes": ["email", "phone"],
      "status": "coming_soon"
    }
  ]
}
```

---

## Database Schema

### Prisma Models

```prisma
model EnrichmentJob {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String
  listId          String
  vendor          String    @default("prospeo") // prospeo, apollo, hunter, clearbit
  enrichmentType  String    // email, phone
  status          String    @default("pending") // pending, processing, completed, failed
  totalRows       Int
  processedRows   Int       @default(0)
  successCount    Int       @default(0)
  errorCount      Int       @default(0)
  creditsUsed     Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])
  list         LeadList     @relation(fields: [listId], references: [id], onDelete: Cascade)
  items        EnrichmentJobItem[]

  @@index([organizationId])
  @@index([userId])
  @@index([listId])
  @@index([status])
}

model EnrichmentJobItem {
  id              String    @id @default(cuid())
  jobId           String
  leadId          String
  linkedinUrl     String
  status          String    @default("pending") // pending, processing, completed, failed, not_found
  enrichedEmail   String?
  enrichedPhone   String?
  prospeoResponse Json?     // Raw API response
  errorMessage    String?
  createdAt       DateTime  @default(now())
  processedAt     DateTime?

  job  EnrichmentJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  lead Lead         @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([leadId])
  @@index([status])
}

model VendorApiKey {
  id             String   @id @default(cuid())
  organizationId String
  vendor         String   // prospeo, apollo, hunter, clearbit
  encryptedKey   String   // AES-256 encrypted
  isActive       Boolean  @default(true)
  createdById    String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@unique([organizationId, vendor])
  @@index([organizationId])
}
```

---

## TypeScript Types

```typescript
// shared/types/src/requests/enrich.ts

import { z } from 'zod';

// Enums
export type EnrichmentJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type EnrichmentItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_found';
export type EnrichmentType = 'email' | 'phone';
export type EnrichmentVendor = 'prospeo' | 'apollo' | 'hunter' | 'clearbit';

// Request schemas
export const createEnrichmentJobSchema = z.object({
  listId: z.string().min(1),
  enrichmentType: z.enum(['email', 'phone']),
});

export const getEnrichmentJobsQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export const saveVendorApiKeySchema = z.object({
  vendor: z.enum(['prospeo', 'apollo', 'hunter', 'clearbit']),
  apiKey: z.string().min(1),
});

// Response types
export interface EnrichmentJobResponse {
  id: string;
  listId: string;
  listName: string;
  vendor: EnrichmentVendor;
  enrichmentType: EnrichmentType;
  status: EnrichmentJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface EnrichmentJobsListResponse {
  jobs: EnrichmentJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VendorResponse {
  id: EnrichmentVendor;
  name: string;
  isConfigured: boolean;
  supportedTypes: EnrichmentType[];
  status: 'active' | 'coming_soon';
}

export interface VendorsListResponse {
  vendors: VendorResponse[];
}

export interface ApiKeyResponse {
  vendor: EnrichmentVendor;
  isConfigured: boolean;
  maskedKey: string | null; // "••••••••abc123"
  updatedAt: string | null;
}

export interface ApiKeysListResponse {
  apiKeys: ApiKeyResponse[];
}
```

---

## Prospeo API Integration

### Client Implementation

```typescript
// backend/src/clients/prospeo.client.ts

import { config } from '../config';

interface ProspeoEmailResponse {
  email: string;
  email_status: 'valid' | 'invalid' | 'unknown';
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  linkedin_url: string;
}

interface ProspeoPhoneResponse {
  phone_number: string;
  phone_type: 'mobile' | 'landline' | 'unknown';
  first_name: string;
  last_name: string;
  linkedin_url: string;
}

interface ProspeoError {
  error: string;
  message: string;
}

export class ProspeoClient {
  private baseUrl = 'https://api.prospeo.io';

  constructor(private apiKey: string) {}

  async findEmail(linkedinUrl: string): Promise<ProspeoEmailResponse | null> {
    const response = await fetch(`${this.baseUrl}/linkedin-email-finder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': this.apiKey,
      },
      body: JSON.stringify({
        url: linkedinUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as ProspeoError;
      throw new Error(error.message || `Prospeo API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.email || data.email_status === 'invalid') {
      return null;
    }

    return data as ProspeoEmailResponse;
  }

  async findPhone(linkedinUrl: string): Promise<ProspeoPhoneResponse | null> {
    const response = await fetch(`${this.baseUrl}/mobile-finder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': this.apiKey,
      },
      body: JSON.stringify({
        url: linkedinUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as ProspeoError;
      throw new Error(error.message || `Prospeo API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.phone_number) {
      return null;
    }

    return data as ProspeoPhoneResponse;
  }
}
```

### API Key Encryption

```typescript
// backend/src/lib/encryption.ts

import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(config.encryption.key, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(config.encryption.key, 'hex'),
    iv
  );

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskApiKey(key: string): string {
  if (key.length <= 6) return '••••••';
  return '••••••••' + key.slice(-6);
}
```

---

## Queue Processing

### Queue Setup

```typescript
// backend/src/queues/enrich.queue.ts

import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const enrichQueue = new Queue('enrich', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export interface EnrichJobData {
  jobId: string;
  organizationId: string;
}
```

### Worker Implementation

```typescript
// backend/src/workers/enrich.worker.ts

import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { ProspeoClient } from '../clients/prospeo.client';
import { enrichmentJobRepository } from '../repositories/enrichmentJob.repository';
import { vendorApiKeyRepository } from '../repositories/vendorApiKey.repository';
import { leadRepository } from '../repositories/lead.repository';
import { enrichService } from '../services/enrich.service';
import { decrypt } from '../lib/encryption';

const BATCH_SIZE = 50;

const enrichWorker = new Worker(
  'enrich',
  async (job: Job) => {
    const { jobId, organizationId } = job.data;

    // Get job
    const enrichJob = await enrichmentJobRepository.findById(jobId);
    if (!enrichJob) throw new Error('Job not found');

    // Get API key
    const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
      organizationId,
      enrichJob.vendor
    );
    if (!apiKeyRecord) throw new Error('API key not configured');

    const apiKey = decrypt(apiKeyRecord.encryptedKey);
    const prospeoClient = new ProspeoClient(apiKey);

    // Update job status
    await enrichmentJobRepository.update(jobId, { status: 'processing' });

    // Process in batches
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const items = await enrichmentJobRepository.getPendingItems(jobId, BATCH_SIZE, offset);

      if (items.length === 0) {
        hasMore = false;
        continue;
      }

      for (const item of items) {
        try {
          let result;

          if (enrichJob.enrichmentType === 'email') {
            result = await prospeoClient.findEmail(item.linkedinUrl);
            if (result) {
              await leadRepository.update(item.leadId, {
                email: result.email,
              });
              await enrichmentJobRepository.updateItem(item.id, {
                status: 'completed',
                enrichedEmail: result.email,
                prospeoResponse: result,
                processedAt: new Date(),
              });
            } else {
              await enrichmentJobRepository.updateItem(item.id, {
                status: 'not_found',
                processedAt: new Date(),
              });
            }
          } else {
            result = await prospeoClient.findPhone(item.linkedinUrl);
            if (result) {
              await leadRepository.update(item.leadId, {
                phone: result.phone_number,
              });
              await enrichmentJobRepository.updateItem(item.id, {
                status: 'completed',
                enrichedPhone: result.phone_number,
                prospeoResponse: result,
                processedAt: new Date(),
              });
            } else {
              await enrichmentJobRepository.updateItem(item.id, {
                status: 'not_found',
                processedAt: new Date(),
              });
            }
          }

          // Update progress
          await enrichService.updateJobProgress(jobId);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          await enrichmentJobRepository.updateItem(item.id, {
            status: 'failed',
            errorMessage: error.message,
            processedAt: new Date(),
          });
          await enrichService.updateJobProgress(jobId);
        }
      }

      offset += BATCH_SIZE;
    }

    // Mark complete
    await enrichmentJobRepository.update(jobId, {
      status: 'completed',
      completedAt: new Date(),
    });
  },
  { connection: redis }
);

export { enrichWorker };
```

---

## Frontend Components

### Hooks

```typescript
// frontend/hooks/api/useEnrich.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ENDPOINTS, QUERY_KEYS } from '@/lib/config';

export function useEnrichmentJobs(options?: { status?: string }) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENRICHMENT_JOBS, options],
    queryFn: () => api.get(ENDPOINTS.ENRICH.JOBS, options),
  });
}

export function useEnrichmentJob(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENRICHMENT_JOB, jobId],
    queryFn: () => api.get(ENDPOINTS.ENRICH.JOB(jobId)),
    refetchInterval: (data) =>
      data?.status === 'processing' ? 3000 : false,
    ...options,
  });
}

export function useCreateEnrichmentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { listId: string; enrichmentType: 'email' | 'phone' }) =>
      api.post(ENDPOINTS.ENRICH.JOBS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENRICHMENT_JOBS] });
    },
  });
}

export function useVendors() {
  return useQuery({
    queryKey: [QUERY_KEYS.VENDORS],
    queryFn: () => api.get(ENDPOINTS.ENRICH.VENDORS),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: [QUERY_KEYS.API_KEYS],
    queryFn: () => api.get(ENDPOINTS.ORG.API_KEYS),
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { vendor: string; apiKey: string }) =>
      api.post(ENDPOINTS.ORG.API_KEYS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendor: string) =>
      api.delete(ENDPOINTS.ORG.API_KEY(vendor)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDORS] });
    },
  });
}

export async function downloadEnrichedResults(jobId: string, filename: string) {
  const response = await fetch(ENDPOINTS.ENRICH.DOWNLOAD(jobId), {
    credentials: 'include',
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
```

### Components List

**Pages:**
- `EnrichPage` - Main enrich page with form and jobs table
- `ApiKeysPage` - Settings page for API key management

**Form:**
- `EnrichForm` - List selector, type selector, start button
- `ListSelector` - Dropdown with list details
- `EnrichmentTypeSelector` - Radio buttons for email/phone

**Jobs:**
- `EnrichJobCard` - Progress card for active job
- `EnrichJobsTable` - History of all enrichment jobs
- `EnrichJobRow` - Individual job row with actions

**Settings:**
- `ApiKeyCard` - Vendor card with key input
- `ApiKeyInput` - Masked input with update/remove

---

## Implementation Order

1. Database schema - EnrichmentJob, EnrichmentJobItem, VendorApiKey
2. API key encryption utilities
3. Prospeo client
4. Backend repositories
5. Backend service - Job creation, progress tracking
6. Queue setup - BullMQ queue and worker
7. Backend controllers and routes
8. Shared types
9. Frontend config - Endpoints and query keys
10. Frontend hooks
11. Frontend pages (enrich, api-keys settings)
12. Frontend components
13. Real-time updates via Pusher

---

## Testing Checklist

### List Selection
- [ ] Dropdown shows all lists from Lists tab
- [ ] Shows list name and lead count
- [ ] Detects linkedin_url column correctly
- [ ] Shows error if no LinkedIn column

### Enrichment
- [ ] Can start email enrichment job
- [ ] Can start phone enrichment job
- [ ] Progress updates in real-time
- [ ] Leads updated with enriched data
- [ ] Can download enriched CSV

### API Keys
- [ ] Admin can add API key
- [ ] Key is encrypted in database
- [ ] Key is masked in UI
- [ ] Admin can update/remove key
- [ ] Non-admin cannot access API keys page

### Error Handling
- [ ] Shows error if no API key configured
- [ ] Handles Prospeo API errors
- [ ] Retries failed requests
- [ ] Shows error messages to user

### Credits
- [ ] Credits used count is accurate
- [ ] Updates on each successful enrichment
