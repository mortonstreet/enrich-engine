# Enrich V2 Feature Spec

**Module Owner:** Enrich Team
**Status:** Implemented
**Dependencies:** lists.md, scrape.md

---

## Overview

Enrich V2 provides enhanced email and phone enrichment with the following key improvements:

1. **Email Guessing** - Domain-based email pattern generation before using paid APIs
2. **Domain Scraping** - Company domains are now scraped during the scrape phase
3. **LinkedIn URL Validation** - Only valid profile URLs are enriched (excludes company pages)
4. **First Line Generator** - AI-powered personalized first lines via OpenRouter

---

## Implementation Status

### Features
- [x] Email enrichment via Prospeo
- [x] Phone enrichment via Prospeo
- [x] LinkedIn URL validation (excludes `/company/`, `/school/` pages)
- [x] Company domain scraping during scrape phase
- [x] First line generation via OpenRouter (Gemini 2.0 Flash)
- [x] OpenRouter API key pre-validation
- [x] Detailed logging for debugging

### Key Files

**Backend:**
- `backend/src/services/enrich.service.ts` - Enrichment job creation with URL validation
- `backend/src/services/copyGenerator.service.ts` - First line generation service
- `backend/src/services/copyGenerator.worker.ts` - Background processing
- `backend/src/utils/linkedinValidator.ts` - URL validation utilities
- `backend/src/clients/serper.client.ts` - Domain search functions
- `backend/src/clients/openrouter.client.ts` - OpenRouter API client

**Frontend:**
- `frontend/components/enrich/CopyGeneratorFlow.tsx` - First line generation UI

---

## Email Guesser Feature

### Strategies

| Strategy | Description | Cost |
|----------|-------------|------|
| `direct` | Skip guessing, use Prospeo directly | 1 credit per lead |
| `guess_first` | Try email patterns first, fallback to Prospeo | Validation cost + fallback |
| `guess_only` | Only use email patterns, no Prospeo fallback | Validation cost only |

### Email Pattern Generation

When a lead has a company domain, the system generates email candidates using common patterns:

```
Patterns (in priority order):
1. first.last@domain.com
2. firstlast@domain.com
3. flast@domain.com
4. firstl@domain.com
5. first@domain.com
6. last@domain.com
7. first_last@domain.com
8. first-last@domain.com
```

### Validation Flow

1. Generate email candidates from name + domain
2. Validate with MillionVerifier API
3. If valid email found, use it
4. If no valid email found and strategy is `guess_first`, fallback to Prospeo
5. Update lead record with validated email

### Domain Email Patterns (Learning)

The system learns successful patterns per domain:

```typescript
// DomainEmailPattern model
{
  domain: "acme.com",
  patterns: [
    { pattern: "first.last", successRate: 0.8 },
    { pattern: "flast", successRate: 0.15 },
    { pattern: "first", successRate: 0.05 }
  ]
}
```

---

## Company Domain Integration

### How Domains Are Captured

1. **During Scrape Phase:**
   - After finding LinkedIn URL, system searches for company domain
   - Query format: `site:www. "{company name}"`
   - First non-social-media domain is extracted
   - Stored in `scrape_job_item.companyDomain`

2. **Transfer to Lead:**
   - When creating leads from scrape results
   - `companyDomain` is copied to `lead.companyDomain`

3. **Usage in Email Guessing:**
   - Email guesser uses stored domain
   - Skips Serper API call if domain already exists

### Excluded Domains

The following domains are skipped when searching for company websites:
- linkedin.com
- facebook.com
- twitter.com / x.com
- instagram.com
- youtube.com
- wikipedia.org
- crunchbase.com
- glassdoor.com
- indeed.com
- bloomberg.com
- forbes.com
- reuters.com
- zoominfo.com
- pitchbook.com

---

## LinkedIn URL Validation

### Valid URLs

Only personal profile URLs are accepted:
```
https://www.linkedin.com/in/john-smith
https://linkedin.com/in/jane-doe/
```

### Invalid URLs (Excluded)

The following are filtered out before enrichment:
- Company pages: `linkedin.com/company/acme-corp`
- School pages: `linkedin.com/school/harvard`
- Showcase pages: `linkedin.com/showcase/product`
- Malformed URLs
- Empty/null URLs

### Validation Function

```typescript
import { isValidLinkedInProfileUrl } from "@/utils/linkedinValidator";

// Returns true only for valid /in/ profile URLs
isValidLinkedInProfileUrl("https://linkedin.com/in/john-smith"); // true
isValidLinkedInProfileUrl("https://linkedin.com/company/acme"); // false
```

---

## First Line Generator

### Overview

Generates personalized first lines for cold outreach using OpenRouter API.

### Requirements

1. **OpenRouter API Key** - Must be configured in Settings > API Keys
2. **Lead Data** - firstName, lastName, role, company, linkedinUrl
3. **User Prompt** - Custom instructions for generation style

### Model

- **Model:** Google Gemini 2.0 Flash (`google/gemini-2.0-flash-001`)
- **Cost:** ~$0.001 per lead
- **Temperature:** 0.7
- **Max Tokens:** 100

### Generation Rules

1. Write ONLY the first line - no greetings
2. Keep it under 20 words
3. Be specific and personal
4. Sound natural, not salesy
5. Create genuine curiosity
6. Avoid generic phrases like "I noticed"

### API Key Check

Before starting generation:
1. System checks for OpenRouter API key in `vendor_api_key` table
2. Attempts to decrypt the key
3. If missing or invalid, shows warning with setup instructions
4. If valid, proceeds with generation

### Troubleshooting

If first lines are not generating:

1. **Check API Key:**
   ```sql
   SELECT * FROM vendor_api_key WHERE vendor = 'openrouter';
   ```

2. **Check Queue:**
   ```bash
   # Redis queue inspection
   redis-cli LRANGE copy-generator 0 -1
   ```

3. **Check Logs:**
   ```bash
   grep "CopyGenerator" /var/log/app.log
   ```

4. **Verify OpenRouter Usage:**
   Visit https://openrouter.ai/activity to check API calls

---

## Prospeo Enrichment

### Email Enrichment

**Endpoint:** `/linkedin-email-finder`
**Input:** LinkedIn profile URL
**Output:** Verified email address

### Phone Enrichment

**Endpoint:** `/mobile-finder`
**Input:** LinkedIn profile URL
**Output:** Mobile phone number

### URL Validation

Before calling Prospeo:
1. URLs are validated using `isValidLinkedInProfileUrl()`
2. Company pages and malformed URLs are excluded
3. Clear error message if no valid URLs in list

### Error Handling

- Invalid URL format: Skipped with reason logged
- API errors: Retried with exponential backoff
- Not found: Marked as `not_found` status

---

## Database Schema Additions

### ScrapeJobItem.companyDomain

```prisma
model ScrapeJobItem {
  // ... existing fields ...
  companyDomain  String?   // Company domain scraped during job
}
```

### EmailValidationAttempt

Tracks each email validation attempt:

```prisma
model EmailValidationAttempt {
  id                 String    @id
  jobItemId          String
  leadId             String
  email              String
  pattern            String    // e.g., "first.last", "flast"
  status             String    // valid, bounced, catch_all, unknown, error
  validationResponse Json?
  createdAt          DateTime
  processedAt        DateTime?
}
```

---

## API Changes

### POST /enrich/jobs

Now validates LinkedIn URLs before creating job:

```json
{
  "listId": "list_123",
  "enrichmentType": "email"
}
```

**New Behavior:**
- Filters leads to only valid LinkedIn profile URLs
- Returns count of excluded leads in response
- Throws error if no valid URLs after filtering

### Error Response Example

```json
{
  "error": "No leads with valid LinkedIn profile URLs found. 15 leads were excluded (company pages, malformed URLs, etc.)."
}
```

---

## Frontend Changes

### CopyGeneratorFlow.tsx

Added API key pre-check:

```tsx
// Check if OpenRouter API key is configured
const { data: apiKeysData } = useApiKeys();
const hasOpenRouterKey = apiKeysData?.apiKeys?.find(
  k => k.vendor === "openrouter"
)?.isConfigured;

if (!hasOpenRouterKey) {
  return <ApiKeyMissingWarning />;
}
```

### Warning Display

When API key is missing:
1. Shows amber warning box
2. Explains what OpenRouter is
3. Links to Settings > API Keys
4. Links to OpenRouter signup

---

## Testing Checklist

### Domain Scraping
- [ ] Serper query uses `site:www. "{company}"` format
- [ ] Domain stored in `scrape_job_item.companyDomain`
- [ ] Domain transferred to `lead.companyDomain`
- [ ] Email guessing uses stored domain

### LinkedIn URL Filtering
- [ ] Only `/in/` profile URLs included in enrichment
- [ ] Company pages (`/company/`) excluded
- [ ] School pages (`/school/`) excluded
- [ ] Malformed URLs excluded
- [ ] User sees clear error message

### Prospeo Enrichment
- [ ] Invalid URLs filtered before API calls
- [ ] Clear error for lists with no valid URLs
- [ ] Email enrichment works for valid profiles
- [ ] Phone enrichment works for valid profiles

### OpenRouter First Line
- [ ] API key status shown before job creation
- [ ] Warning displayed when key is missing
- [ ] Job queued successfully when key is valid
- [ ] Worker processes jobs correctly
- [ ] First lines saved to lead records
- [ ] Usage shows in OpenRouter dashboard

---

## Verification Steps

1. **Domain Scraping:**
   ```sql
   SELECT id, company_domain FROM scrape_job_item
   WHERE job_id = ? AND company_domain IS NOT NULL;
   ```

2. **URL Filtering:**
   - Create scrape with mix of profile/company URLs
   - Verify enrichment job only includes profile URLs

3. **OpenRouter:**
   ```sql
   SELECT * FROM vendor_api_key WHERE vendor = 'openrouter';
   ```
   ```sql
   SELECT first_line FROM lead WHERE first_line IS NOT NULL;
   ```

4. **End-to-End:**
   - Upload company/role CSV
   - Wait for scrape completion
   - Verify domains are captured
   - Start email enrichment
   - Start first line generation
   - Verify all data populated
