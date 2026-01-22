# GTMDialer - EnrichEngine Integration Specification

> **EnrichEngine Website:** https://enrichengine.xyz
> **EnrichEngine App:** https://app.enrichengine.xyz
> **API Base URL:** https://api.enrichengine.xyz/api/external

## Overview

This document specifies how GTMDialer should integrate with EnrichEngine's External API to pull and sync lead lists for dialing campaigns.

---

## Integration Type: API Key (NOT OAuth)

**This is a direct API key connection, not OAuth.**

EnrichEngine uses simple API key authentication for third-party integrations. There is no OAuth flow, no token refresh, and no user authorization screens. Users generate a static API key in EnrichEngine and enter it into GTMDialer.

---

## 1. Authentication

### How It Works

EnrichEngine uses **API Key authentication** (not OAuth). This is a simple, direct connection:

1. User generates an API key in EnrichEngine
2. User copies the key into GTMDialer's settings
3. GTMDialer stores the key and uses it for all API requests
4. No token refresh or re-authorization needed (keys don't expire unless user sets expiration)

### API Key Setup (User Flow)

Users must first create an API key in EnrichEngine:
1. Log into EnrichEngine at `https://app.enrichengine.xyz`
2. Navigate to **Settings > External API Keys**
3. Click **Create API Key**
4. Name it (e.g., "GTMDialer Integration")
5. Select scopes: `lists:read` (required)
6. Copy the generated key (shown only once, starts with `ee_`)

### Authentication Method

All requests must include the API key in the `X-API-Key` header:

```
X-API-Key: ee_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:** This is NOT a Bearer token. Use `X-API-Key` header, not `Authorization`.

### Base URL

```
Production: https://api.enrichengine.xyz/api/external
```

### Key Format

All EnrichEngine API keys follow this format:
- Prefix: `ee_` followed by 8 characters (e.g., `ee_abc12345`)
- Full key: `ee_abc12345_` followed by ~40 characters
- Total length: approximately 55 characters
- Example: `ee_k7xPq2mN_dGhpcyBpcyBhIHRlc3Qga2V5IGZvciBkZW1v`

---

## 2. API Endpoints

### 2.1 List All Lists

Retrieves all lead lists accessible to the organization.

**Endpoint:** `GET /lists`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | - | Filter lists by name |

**Request Example:**
```bash
curl -X GET "https://api.enrichengine.xyz/api/external/lists?page=1&limit=20" \
  -H "X-API-Key: ee_xxxxxxxx_xxxxxxxxxxxxx"
```

**Response:**
```json
{
  "lists": [
    {
      "id": "uuid-string",
      "name": "Q1 Outbound Prospects",
      "description": "Prospects from LinkedIn Sales Nav export",
      "leadCount": 1523,
      "source": "uploaded",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 2.2 Get List Details with Leads

Retrieves a specific list and its leads (paginated).

**Endpoint:** `GET /lists/:listId`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `listId` | UUID | The list identifier |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 100 | Leads per page (max 500) |

**Request Example:**
```bash
curl -X GET "https://api.enrichengine.xyz/api/external/lists/abc-123-uuid?page=1&limit=100" \
  -H "X-API-Key: ee_xxxxxxxx_xxxxxxxxxxxxx"
```

**Response:**
```json
{
  "list": {
    "id": "abc-123-uuid",
    "name": "Q1 Outbound Prospects",
    "description": "Prospects from LinkedIn Sales Nav export",
    "leadCount": 1523,
    "source": "uploaded",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "leads": [
    {
      "id": "lead-uuid-1",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@acme.com",
      "phone": "+1-555-123-4567",
      "company": "Acme Corp",
      "role": "VP of Sales",
      "linkedinUrl": "https://linkedin.com/in/johnsmith",
      "companyDomain": "acme.com",
      "customFields": {
        "industry": "Technology",
        "employee_count": "500-1000"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1523,
    "totalPages": 16
  }
}
```

---

## 3. Data Models

### TypeScript Interfaces

```typescript
// API Key scopes
type ExternalApiScope = 'lists:read' | 'lists:write' | 'leads:read' | 'leads:write';

// List object
interface EnrichEngineList {
  id: string;
  name: string;
  description: string | null;
  leadCount: number;
  source: 'uploaded' | 'scraped';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Lead object
interface EnrichEngineLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  linkedinUrl: string | null;
  companyDomain: string | null;
  customFields: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Pagination object
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Responses
interface ListsResponse {
  lists: EnrichEngineList[];
  pagination: Pagination;
}

interface ListDetailResponse {
  list: EnrichEngineList;
  leads: EnrichEngineLead[];
  pagination: Pagination;
}

// Error response
interface ErrorResponse {
  error: string;
}
```

---

## 4. Implementation Guide

### 4.1 GTMDialer Configuration

Add EnrichEngine integration settings to GTMDialer.

**Note:** This is a direct API connection, not OAuth. Store the user's API key (encrypted) and use it for all requests.

```typescript
// config/integrations.ts
interface EnrichEngineConfig {
  apiKey: string;          // User's API key from enrichengine.xyz
  baseUrl: string;         // Always https://api.enrichengine.xyz/api/external
  syncInterval?: number;   // minutes, for auto-sync
}

// Default configuration
const ENRICHENGINE_BASE_URL = 'https://api.enrichengine.xyz/api/external';

// Per-user configuration (stored in database, API key encrypted)
interface UserEnrichEngineConnection {
  userId: string;
  apiKeyEncrypted: string;  // Encrypt before storing!
  isActive: boolean;
  lastSyncAt: Date | null;
}
```

### 4.2 API Client

Create a dedicated API client for EnrichEngine:

```typescript
// lib/enrichengine-client.ts
import axios, { AxiosInstance } from 'axios';

class EnrichEngineClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseUrl: string = 'https://api.enrichengine.xyz/api/external') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  async getLists(options?: { page?: number; limit?: number; search?: string }): Promise<ListsResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.search) params.set('search', options.search);

    const response = await this.client.get<ListsResponse>(`/lists?${params}`);
    return response.data;
  }

  async getListWithLeads(
    listId: string,
    options?: { page?: number; limit?: number }
  ): Promise<ListDetailResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.limit) params.set('limit', options.limit.toString());

    const response = await this.client.get<ListDetailResponse>(`/lists/${listId}?${params}`);
    return response.data;
  }

  async getAllLeadsFromList(listId: string): Promise<EnrichEngineLead[]> {
    const allLeads: EnrichEngineLead[] = [];
    let page = 1;
    const limit = 500; // Max allowed

    while (true) {
      const response = await this.getListWithLeads(listId, { page, limit });
      allLeads.push(...response.leads);

      if (page >= response.pagination.totalPages) {
        break;
      }
      page++;
    }

    return allLeads;
  }
}

export default EnrichEngineClient;
```

### 4.3 Database Schema (GTMDialer)

Add tables to track EnrichEngine integration:

```sql
-- Track connected EnrichEngine accounts
CREATE TABLE enrichengine_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  organization_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track synced lists
CREATE TABLE enrichengine_synced_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES enrichengine_connections(id) ON DELETE CASCADE,
  enrichengine_list_id TEXT NOT NULL,
  gtmdialer_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  list_name TEXT NOT NULL,
  lead_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP,
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, synced, error
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(connection_id, enrichengine_list_id)
);

-- Index for faster lookups
CREATE INDEX idx_synced_lists_connection ON enrichengine_synced_lists(connection_id);
```

### 4.4 Sync Service

Implement the sync logic:

```typescript
// services/enrichengine-sync.service.ts
import EnrichEngineClient from '../lib/enrichengine-client';
import { db } from '../lib/db';

interface SyncResult {
  listId: string;
  leadsImported: number;
  leadsUpdated: number;
  errors: string[];
}

class EnrichEngineSyncService {
  private client: EnrichEngineClient;

  constructor(apiKey: string) {
    this.client = new EnrichEngineClient(apiKey);
  }

  async syncList(enrichEngineListId: string, gtmDialerCampaignId: string): Promise<SyncResult> {
    const result: SyncResult = {
      listId: enrichEngineListId,
      leadsImported: 0,
      leadsUpdated: 0,
      errors: [],
    };

    try {
      // Update sync status
      await db.enrichengineSyncedLists.update({
        where: { enrichengineListId: enrichEngineListId },
        data: { syncStatus: 'syncing' },
      });

      // Fetch all leads from EnrichEngine
      const leads = await this.client.getAllLeadsFromList(enrichEngineListId);

      for (const lead of leads) {
        try {
          // Map EnrichEngine lead to GTMDialer contact
          const contactData = this.mapLeadToContact(lead, gtmDialerCampaignId);

          // Upsert contact (update if exists, create if not)
          const existing = await db.contacts.findFirst({
            where: {
              campaignId: gtmDialerCampaignId,
              OR: [
                { email: lead.email },
                { phone: lead.phone },
                { externalId: lead.id },
              ],
            },
          });

          if (existing) {
            await db.contacts.update({
              where: { id: existing.id },
              data: contactData,
            });
            result.leadsUpdated++;
          } else {
            await db.contacts.create({
              data: {
                ...contactData,
                externalId: lead.id,
                externalSource: 'enrichengine',
              },
            });
            result.leadsImported++;
          }
        } catch (error) {
          result.errors.push(`Failed to sync lead ${lead.id}: ${error.message}`);
        }
      }

      // Update sync status
      await db.enrichengineSyncedLists.update({
        where: { enrichengineListId: enrichEngineListId },
        data: {
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          leadCount: leads.length,
        },
      });
    } catch (error) {
      await db.enrichengineSyncedLists.update({
        where: { enrichengineListId: enrichEngineListId },
        data: { syncStatus: 'error' },
      });
      throw error;
    }

    return result;
  }

  private mapLeadToContact(lead: EnrichEngineLead, campaignId: string) {
    return {
      campaignId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: this.normalizePhone(lead.phone),
      company: lead.company,
      title: lead.role,
      linkedinUrl: lead.linkedinUrl,
      customFields: lead.customFields,
      updatedAt: new Date(),
    };
  }

  private normalizePhone(phone: string | null): string | null {
    if (!phone) return null;
    // Remove all non-numeric characters except leading +
    return phone.replace(/[^\d+]/g, '');
  }
}

export default EnrichEngineSyncService;
```

### 4.5 UI Components

#### Connection Setup Modal

This is a simple API key input - NOT an OAuth flow. No redirects, no authorization screens.

```tsx
// components/integrations/EnrichEngineConnect.tsx
import { useState } from 'react';
import { toast } from 'sonner';

export function EnrichEngineConnectModal({ isOpen, onClose, onSuccess }) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    // Validate API key format
    if (!apiKey.startsWith('ee_')) {
      toast.error('Invalid API key format. Key should start with "ee_"');
      return;
    }

    if (apiKey.length < 40) {
      toast.error('API key appears too short. Please check and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Test the connection by fetching lists from EnrichEngine
      const response = await fetch('/api/integrations/enrichengine/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your key and try again.');
        }
        throw new Error(data.error || 'Failed to connect');
      }

      toast.success('Connected to EnrichEngine!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to connect. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect to EnrichEngine">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Connect your EnrichEngine account to import enriched leads directly into GTMDialer campaigns.
        </p>

        {/* Step-by-step instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">How to get your API key:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://app.enrichengine.xyz/dashboard/settings" target="_blank" rel="noopener" className="underline">app.enrichengine.xyz/dashboard/settings</a></li>
            <li>Scroll to "External API Keys"</li>
            <li>Click "Create API Key"</li>
            <li>Name it "GTMDialer" and select "Read Lists" permission</li>
            <li>Copy the key (it starts with <code className="bg-blue-100 px-1 rounded">ee_</code>)</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">EnrichEngine API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ee_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored securely and encrypted.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isLoading || !apiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Connect'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

#### List Selector

```tsx
// components/integrations/EnrichEngineListSelector.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function EnrichEngineListSelector({ onSelect, campaignId }) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['enrichengine-lists', search],
    queryFn: async () => {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/integrations/enrichengine/lists?${params}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search lists..."
        className="w-full px-3 py-2 border rounded-lg"
      />

      {isLoading ? (
        <div className="text-center py-8">Loading lists...</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data?.lists?.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(list)}
            >
              <div>
                <p className="font-medium">{list.name}</p>
                <p className="text-sm text-gray-500">
                  {list.leadCount} leads • {list.source}
                </p>
              </div>
              <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                Import
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 5. Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 401 | Invalid/missing API key | Prompt user to re-enter API key |
| 403 | Missing required scope | Show error, explain required permissions |
| 404 | List not found | Remove from synced lists |
| 429 | Rate limited | Implement exponential backoff |
| 500 | Server error | Retry with backoff, log error |

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error; // Don't retry auth errors
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## 6. Rate Limiting

EnrichEngine applies the following rate limits:

| Endpoint | Rate Limit |
|----------|------------|
| GET /lists | 100 requests/minute |
| GET /lists/:id | 60 requests/minute |

Implement rate limiting on the GTMDialer side:

```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000, // 1 request per second
});

// Wrap API calls
const getLists = limiter.wrap(client.getLists.bind(client));
const getListWithLeads = limiter.wrap(client.getListWithLeads.bind(client));
```

---

## 7. Webhooks (Future)

> Note: Webhook support is planned for a future release.

When available, GTMDialer should register webhooks to receive real-time updates:

- `list.updated` - When a list is modified
- `list.deleted` - When a list is deleted
- `leads.enriched` - When leads in a list are enriched

---

## 8. Security Considerations

1. **Store API keys encrypted** - Never store in plain text
2. **Use environment variables** - For server-side API key storage
3. **Validate API key format** - Must start with `ee_`
4. **Implement key rotation** - Allow users to revoke and regenerate keys
5. **Log access** - Track when and how the integration is used
6. **Scope minimization** - Only request necessary scopes (`lists:read`)

---

## 9. Testing

### Test Environment

EnrichEngine uses a single production environment:

```
API URL: https://api.enrichengine.xyz/api/external
App URL: https://app.enrichengine.xyz
```

For development/testing:
1. Create a test organization in EnrichEngine
2. Generate an API key with `lists:read` scope
3. Create a test list with sample leads
4. Use that API key for GTMDialer development

### Mock Data (for unit tests)

```typescript
const mockList: EnrichEngineList = {
  id: 'test-list-001',
  name: 'Test List',
  description: 'For testing purposes',
  leadCount: 3,
  source: 'uploaded',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockLeads: EnrichEngineLead[] = [
  {
    id: 'lead-001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1-555-000-0001',
    company: 'Test Corp',
    role: 'Manager',
    linkedinUrl: null,
    companyDomain: 'example.com',
    customFields: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];
```

---

## 10. Checklist

### MVP Implementation

- [ ] API client with authentication
- [ ] Connection setup UI (API key input)
- [ ] List browser/selector
- [ ] Basic sync (import leads to campaign)
- [ ] Error handling for auth failures

### Phase 2

- [ ] Auto-sync on schedule
- [ ] Sync status tracking
- [ ] Duplicate detection
- [ ] Field mapping customization
- [ ] Webhook support (when available)

### Phase 3

- [ ] Bi-directional sync (push call outcomes back)
- [ ] Advanced filtering before import
- [ ] Bulk operations
- [ ] Analytics dashboard

---

## Support

For integration support:
- EnrichEngine App: `https://app.enrichengine.xyz`
- EnrichEngine Website: `https://enrichengine.xyz`
- Support Email: `support@enrichengine.xyz`

---

## Appendix: Why API Keys (Not OAuth)

EnrichEngine uses API key authentication instead of OAuth for third-party integrations because:

1. **Simplicity** - Users just copy/paste a key, no complex OAuth flows
2. **No Token Expiry** - API keys don't expire (unless user sets expiration), so no refresh token logic needed
3. **Direct Connection** - No redirects or popup windows required
4. **Server-to-Server** - Ideal for backend integrations like GTMDialer
5. **User Control** - Users can revoke keys anytime from EnrichEngine settings

### Comparison

| Feature | OAuth | API Key (EnrichEngine) |
|---------|-------|------------------------|
| User setup | Click "Authorize", redirect flow | Copy/paste key |
| Token refresh | Required every ~1 hour | Not needed |
| Implementation | Complex | Simple |
| Revocation | Via OAuth provider | User deletes key in settings |
| Scopes | Requested at auth time | Set when key is created |
