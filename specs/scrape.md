# Scrape Feature Spec

**Module Owner:** This session
**Status:** Implemented
**Dependencies:** lists.md (saves results to lists)

---

## Implementation Status

### Features
- [x] CSV upload with strict column naming validation
- [x] Name-based search (first_name, last_name)
- [x] Role-based search (company, role)
- [x] Serper.dev API integration
- [x] LinkedIn URL extraction and validation
- [x] LinkedIn URL filtering (excludes company/school pages)
- [x] Company domain scraping (stored for email guessing)
- [x] Background queue processing (BullMQ)
- [x] Real-time progress updates
- [x] Auto-create list with results
- [x] Job history table
- [x] Download results as CSV

### Key Files
**Database:**
- `shared/db/prisma/schema.prisma` - ScrapeJob, ScrapeJobItem models

**Backend:**
- `backend/src/api/routes/scrape.ts`
- `backend/src/api/controllers/scrape.controller.ts`
- `backend/src/services/scrape.service.ts`
- `backend/src/repositories/scrapeJob.repository.ts`
- `backend/src/clients/serper.client.ts` - LinkedIn search + domain search
- `backend/src/utils/linkedinValidator.ts` - URL validation utilities
- `backend/src/queues/scrape.queue.ts`
- `backend/src/workers/scrape.worker.ts`

**Frontend:**
- `frontend/app/dashboard/scrape/page.tsx`
- `frontend/components/scrape/ScrapeUploadZone.tsx`
- `frontend/components/scrape/ScrapeJobCard.tsx`
- `frontend/components/scrape/ScrapeJobsTable.tsx`
- `frontend/hooks/api/useScrape.ts`

---

## Overview

The Scrape feature is a LinkedIn profile URL finder that takes CSV input with names or company/role combinations and uses Serper.dev to find matching LinkedIn profiles. Results are automatically saved to a new list in the Lists tab for subsequent enrichment.

### User Flow

1. User navigates to Scrape tab
2. Uploads CSV with either:
   - `first_name`, `last_name` columns (find specific people)
   - `company`, `role` columns (find people at companies by role)
3. System validates columns and shows preview
4. User confirms and starts scrape job
5. Background worker processes each row:
   - Builds search query: `site:linkedin.com/in/ "{search terms}"`
   - Calls Serper.dev API
   - Extracts first valid LinkedIn URL from results
6. Real-time progress updates shown
7. On completion: New list created in Lists tab
8. User can view results or start enrichment

---

## Requirements

### 1. CSV Column Requirements (Strict Naming)

**Option A - Name-based search:**
```
first_name (required)
last_name (required)
company (optional - improves accuracy)
```

Example CSV:
```csv
first_name,last_name,company
John,Smith,Acme Corp
Jane,Doe,Tech Inc
```

**Option B - Role-based search:**
```
company (required)
role (required)
```

Example CSV:
```csv
company,role
Acme Corp,CEO
Tech Inc,VP Sales
Stripe,Head of Engineering
```

### 2. Search Query Building

**Name-based query:**
```
site:linkedin.com/in/ "John Smith"
```

With company (improved accuracy):
```
site:linkedin.com/in/ "John Smith" "Acme Corp"
```

**Role-based query:**
```
site:linkedin.com/in/ "CEO" "Acme Corp"
```

### 3. LinkedIn URL Validation

When processing Serper results:
1. Check top result URL
2. Validate URL matches `linkedin.com/in/*` pattern
3. If not LinkedIn (e.g., Instagram, Twitter), check 2nd result
4. If 2nd not LinkedIn, check 3rd result
5. If no LinkedIn URL found, mark as `no_result`

**URL Filtering for Enrichment:**

Only valid LinkedIn profile URLs (`/in/`) are included when creating result lists.
The following URL types are excluded:
- Company pages: `linkedin.com/company/...`
- School pages: `linkedin.com/school/...`
- Showcase pages: `linkedin.com/showcase/...`
- Malformed or empty URLs

### 4. Company Domain Scraping

After finding a LinkedIn URL, the system also searches for the company's domain.

**Query Format:**
```
site:www. "{company name}"
```

**Process:**
1. After finding LinkedIn URL, search for company domain using Serper
2. Extract domain from first non-social-media result
3. Store domain in `companyDomain` field on scrape job item
4. Transfer to lead record when creating result list

**Excluded Domains:**
- linkedin.com, facebook.com, twitter.com, x.com
- instagram.com, youtube.com, wikipedia.org
- crunchbase.com, glassdoor.com, indeed.com
- bloomberg.com, forbes.com, reuters.com
- zoominfo.com, pitchbook.com

**Output:**
- The `companyDomain` is stored on both `ScrapeJobItem` and `Lead` records
- Used by the email guesser to generate email patterns without additional API calls

### 4. Auto-save to Lists

On job completion:
1. Create new LeadList with:
   - Name: "Scrape - {timestamp}" or user-provided name
   - Source: "scraped"
   - scrapeJobId: Link to the job
2. Create Lead records for each row with:
   - Original CSV data (first_name, last_name, company, role)
   - Found linkedin_url
3. Update list leadCount

---

## UI Components

### Scrape Page Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Scrape                                                                     │
│  Find LinkedIn profiles from names or companies                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │     📄  Drop your CSV file here                                    │   │
│  │         or click to browse                                         │   │
│  │                                                                     │   │
│  │     Supported columns:                                             │   │
│  │     • first_name, last_name (find people by name)                 │   │
│  │     • company, role (find people by role at company)              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Recent Jobs                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  | Name           | Status     | Progress | Success | Errors | Created    |│
│  |----------------|------------|----------|---------|--------|------------|│
│  | Scrape - 1/18  | Completed  | 100/100  | 95      | 5      | 2 hours ago|│
│  | Q1 Leads       | Processing | 45/200   | 40      | 5      | 10 min ago |│
│  | Tech CEOs      | Failed     | 20/50    | 15      | 5      | Yesterday  |│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Column Detection Dialog
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Confirm Column Mapping                                                  [X]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Detected search type: Name-based                                          │
│                                                                             │
│  Columns found:                                                             │
│  ✓ first_name                                                              │
│  ✓ last_name                                                               │
│  ✓ company (optional - will improve accuracy)                              │
│                                                                             │
│  Preview (first 3 rows):                                                   │
│  ┌────────────┬───────────┬────────────┐                                   │
│  │ first_name │ last_name │ company    │                                   │
│  ├────────────┼───────────┼────────────┤                                   │
│  │ John       │ Smith     │ Acme Corp  │                                   │
│  │ Jane       │ Doe       │ Tech Inc   │                                   │
│  │ Bob        │ Wilson    │ Startup Co │                                   │
│  └────────────┴───────────┴────────────┘                                   │
│                                                                             │
│  Total rows: 150                                                            │
│                                                                             │
│  Job Name (optional)                                                       │
│  [Q1 Tech Leads                                                  ]         │
│                                                                             │
│                                              [Cancel]  [Start Scraping]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Job Progress Card
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Q1 Tech Leads                                             [View in Lists] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%                              │
│                                                                             │
│  Processing row 45 of 100                                                  │
│                                                                             │
│  ✓ 40 found  •  ✗ 5 not found                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scrape/jobs` | Create scrape job (upload CSV) |
| GET | `/scrape/jobs` | List user's scrape jobs |
| GET | `/scrape/jobs/:id` | Get job status/progress |
| GET | `/scrape/jobs/:id/download` | Download results CSV |
| DELETE | `/scrape/jobs/:id` | Cancel/delete job |

### POST /scrape/jobs

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: CSV file
  - `name`: Optional job name

**Response:**
```json
{
  "id": "job_123",
  "name": "Q1 Tech Leads",
  "status": "pending",
  "totalRows": 100,
  "processedRows": 0,
  "successCount": 0,
  "errorCount": 0,
  "inputType": "name",
  "resultListId": null,
  "createdAt": "2026-01-18T10:00:00Z"
}
```

### GET /scrape/jobs/:id

**Response:**
```json
{
  "id": "job_123",
  "name": "Q1 Tech Leads",
  "status": "processing",
  "totalRows": 100,
  "processedRows": 45,
  "successCount": 40,
  "errorCount": 5,
  "inputType": "name",
  "resultListId": null,
  "createdAt": "2026-01-18T10:00:00Z",
  "updatedAt": "2026-01-18T10:05:00Z"
}
```

### GET /scrape/jobs/:id/download

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="scrape-results.csv"`

CSV includes all original columns plus `linkedin_url` column.

---

## Database Schema

### Prisma Models

```prisma
model ScrapeJob {
  id             String    @id @default(cuid())
  organizationId String
  userId         String
  name           String
  status         String    @default("pending") // pending, processing, completed, failed
  totalRows      Int
  processedRows  Int       @default(0)
  successCount   Int       @default(0)
  errorCount     Int       @default(0)
  inputType      String    // name, role
  resultListId   String?   // Link to created LeadList
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  completedAt    DateTime?

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User          @relation(fields: [userId], references: [id])
  resultList   LeadList?     @relation(fields: [resultListId], references: [id], onDelete: SetNull)
  items        ScrapeJobItem[]

  @@index([organizationId])
  @@index([userId])
  @@index([status])
}

model ScrapeJobItem {
  id             String    @id @default(cuid())
  jobId          String
  rowIndex       Int
  inputData      Json      // Original CSV row data
  linkedinUrl    String?
  companyDomain  String?   // Company domain scraped during job
  status         String    @default("pending") // pending, processing, completed, failed, no_result
  serperResponse Json?     // Raw API response for debugging
  errorMessage   String?
  createdAt      DateTime  @default(now())
  processedAt    DateTime?

  job ScrapeJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([status])
}
```

---

## TypeScript Types

```typescript
// shared/types/src/requests/scrape.ts

import { z } from 'zod';

// Enums
export type ScrapeJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ScrapeItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'no_result';
export type ScrapeInputType = 'name' | 'role';

// Request schemas
export const createScrapeJobSchema = z.object({
  name: z.string().max(255).optional(),
});

export const getScrapeJobsQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

// Response types
export interface ScrapeJobResponse {
  id: string;
  name: string;
  status: ScrapeJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  inputType: ScrapeInputType;
  resultListId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ScrapeJobDetailResponse extends ScrapeJobResponse {
  items?: ScrapeJobItemResponse[];
}

export interface ScrapeJobItemResponse {
  id: string;
  rowIndex: number;
  inputData: Record<string, string>;
  linkedinUrl: string | null;
  status: ScrapeItemStatus;
  errorMessage: string | null;
  processedAt: string | null;
}

export interface ScrapeJobsListResponse {
  jobs: ScrapeJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CSV validation
export interface CSVColumnValidation {
  isValid: boolean;
  inputType: ScrapeInputType | null;
  columns: string[];
  missingColumns: string[];
  errors: string[];
}
```

---

## Serper.dev Integration

### Client Implementation

```typescript
// backend/src/clients/serper.client.ts

import { config } from '../config';

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperSearchResult[];
  searchParameters: {
    q: string;
  };
}

export class SerperClient {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev/search';

  constructor() {
    this.apiKey = config.serper.apiKey;
  }

  async search(query: string): Promise<SerperResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10, // Get top 10 results
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    return response.json();
  }

  extractLinkedInUrl(results: SerperSearchResult[]): string | null {
    const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\//;

    for (const result of results) {
      if (linkedInPattern.test(result.link)) {
        return result.link;
      }
    }

    return null;
  }

  buildNameQuery(firstName: string, lastName: string, company?: string): string {
    let query = `site:linkedin.com/in/ "${firstName} ${lastName}"`;
    if (company) {
      query += ` "${company}"`;
    }
    return query;
  }

  buildRoleQuery(company: string, role: string): string {
    return `site:linkedin.com/in/ "${role}" "${company}"`;
  }
}
```

---

## Queue Processing

### Queue Setup

```typescript
// backend/src/queues/scrape.queue.ts

import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const scrapeQueue = new Queue('scrape', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export interface ScrapeJobData {
  jobId: string;
  organizationId: string;
}
```

### Worker Implementation

```typescript
// backend/src/workers/scrape.worker.ts

import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { SerperClient } from '../clients/serper.client';
import { scrapeJobRepository } from '../repositories/scrapeJob.repository';
import { scrapeService } from '../services/scrape.service';

const serperClient = new SerperClient();

const scrapeWorker = new Worker(
  'scrape',
  async (job: Job) => {
    const { jobId } = job.data;

    // Get job with items
    const scrapeJob = await scrapeJobRepository.findById(jobId);
    if (!scrapeJob) throw new Error('Job not found');

    // Update job status to processing
    await scrapeJobRepository.update(jobId, { status: 'processing' });

    // Get pending items
    const items = await scrapeJobRepository.getPendingItems(jobId);

    for (const item of items) {
      try {
        // Build query based on input type
        const query = scrapeJob.inputType === 'name'
          ? serperClient.buildNameQuery(
              item.inputData.first_name,
              item.inputData.last_name,
              item.inputData.company
            )
          : serperClient.buildRoleQuery(
              item.inputData.company,
              item.inputData.role
            );

        // Execute search
        const response = await serperClient.search(query);

        // Extract LinkedIn URL
        const linkedinUrl = serperClient.extractLinkedInUrl(response.organic);

        // Update item
        await scrapeJobRepository.updateItem(item.id, {
          status: linkedinUrl ? 'completed' : 'no_result',
          linkedinUrl,
          serperResponse: response,
          processedAt: new Date(),
        });

        // Update job progress
        await scrapeService.updateJobProgress(jobId);

        // Rate limiting - respect Serper API limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        await scrapeJobRepository.updateItem(item.id, {
          status: 'failed',
          errorMessage: error.message,
          processedAt: new Date(),
        });
        await scrapeService.updateJobProgress(jobId);
      }
    }

    // Create list with results
    await scrapeService.createResultList(jobId);

    // Mark job complete
    await scrapeJobRepository.update(jobId, {
      status: 'completed',
      completedAt: new Date(),
    });
  },
  { connection: redis }
);

export { scrapeWorker };
```

---

## Frontend Components

### Hooks

```typescript
// frontend/hooks/api/useScrape.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ENDPOINTS, QUERY_KEYS } from '@/lib/config';

export function useScrapeJobs(options?: { status?: string }) {
  return useQuery({
    queryKey: [QUERY_KEYS.SCRAPE_JOBS, options],
    queryFn: () => api.get(ENDPOINTS.SCRAPE.JOBS, options),
  });
}

export function useScrapeJob(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEYS.SCRAPE_JOB, jobId],
    queryFn: () => api.get(ENDPOINTS.SCRAPE.JOB(jobId)),
    refetchInterval: (data) =>
      data?.status === 'processing' ? 3000 : false,
    ...options,
  });
}

export function useCreateScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (name) formData.append('name', name);

      return api.postFormData(ENDPOINTS.SCRAPE.JOBS, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCRAPE_JOBS] });
    },
  });
}

export function useDeleteScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => api.delete(ENDPOINTS.SCRAPE.JOB(jobId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCRAPE_JOBS] });
    },
  });
}

export async function downloadScrapeResults(jobId: string, filename: string) {
  const response = await fetch(ENDPOINTS.SCRAPE.DOWNLOAD(jobId), {
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
- `ScrapePage` - Main scrape page with upload and jobs table

**Upload:**
- `ScrapeUploadZone` - Drag & drop CSV upload
- `ColumnMappingDialog` - Confirm columns and preview

**Jobs:**
- `ScrapeJobCard` - Progress card for active job
- `ScrapeJobsTable` - History of all scrape jobs
- `ScrapeJobRow` - Individual job row with actions

---

## Implementation Order

1. Database schema - Add ScrapeJob, ScrapeJobItem models
2. Serper client - API integration
3. Backend repositories
4. Backend service - Job creation, progress tracking
5. Queue setup - BullMQ queue and worker
6. Backend controllers and routes
7. Shared types
8. Frontend config - Endpoints and query keys
9. Frontend hooks
10. Frontend page and components
11. Real-time updates via Pusher
12. Auto-create list on completion

---

## Testing Checklist

### CSV Upload
- [ ] Can upload CSV with first_name, last_name columns
- [ ] Can upload CSV with company, role columns
- [ ] Rejects CSV without required columns
- [ ] Shows preview of first 3 rows
- [ ] Detects input type correctly (name vs role)

### Search & Processing
- [ ] Builds correct query for name-based search
- [ ] Builds correct query for role-based search
- [ ] Extracts LinkedIn URL from results
- [ ] Falls back to 2nd/3rd result if 1st not LinkedIn
- [ ] Handles no results gracefully
- [ ] Respects Serper API rate limits

### Progress & Status
- [ ] Job status updates correctly
- [ ] Progress bar shows real-time updates
- [ ] Success/error counts are accurate
- [ ] Can view job in jobs table

### Results
- [ ] List created automatically on completion
- [ ] List contains all original data + linkedin_url
- [ ] Can download results as CSV
- [ ] Can navigate to list from job card

### Error Handling
- [ ] Handles Serper API errors
- [ ] Retries failed requests
- [ ] Shows error messages to user
- [ ] Can cancel/delete job
