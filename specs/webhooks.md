# OmniDial Webhooks Specification

## Overview

Real-time event notifications to external systems via HTTP webhooks. Enables integrations with CRMs, analytics platforms, custom applications, and automation tools (Zapier, Make, n8n).

---

## Event Types

### Call Events
| Event | Description | Trigger |
|-------|-------------|---------|
| `call.started` | Outbound/inbound call initiated | Call starts ringing |
| `call.answered` | Call connected | Prospect answers |
| `call.completed` | Call ended | Call terminates |
| `call.missed` | Inbound call not answered | Timeout/hangup |
| `call.voicemail_dropped` | Voicemail left | Voicemail delivery confirmed |
| `call.recording_ready` | Recording available | Recording processed |
| `call.transcription_ready` | Transcript available | Transcription complete |
| `call.coaching_generated` | Coaching feedback ready | AI analysis complete |

### Lead Events
| Event | Description | Trigger |
|-------|-------------|---------|
| `lead.created` | New lead added | Lead creation |
| `lead.updated` | Lead info modified | Field update |
| `lead.deleted` | Lead removed | Soft/hard delete |
| `lead.stage_changed` | Pipeline stage changed | Stage transition |
| `lead.merged` | Leads merged | Duplicate resolution |

### Campaign Events
| Event | Description | Trigger |
|-------|-------------|---------|
| `campaign.created` | New campaign | Campaign creation |
| `campaign.completed` | Campaign finished | All leads processed |
| `campaign.leads_added` | Leads added to campaign | Bulk add |

### User Events
| Event | Description | Trigger |
|-------|-------------|---------|
| `user.dialer_started` | Dialing session began | Power dialer start |
| `user.dialer_stopped` | Dialing session ended | Power dialer stop |
| `user.milestone_reached` | Performance milestone | 100 calls, etc. |

---

## Database Schema

### Table: `webhook_endpoint`
```sql
CREATE TABLE "webhook_endpoint" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,                    -- User-friendly name
    "url" TEXT NOT NULL,                     -- Target URL (HTTPS required)
    "secret" TEXT NOT NULL,                  -- Signing secret (encrypted)
    "events" TEXT[] NOT NULL,                -- Subscribed event types
    "enabled" BOOLEAN DEFAULT true,
    "version" TEXT DEFAULT 'v1',             -- API version
    "headers" JSONB DEFAULT '{}',            -- Custom headers
    "retryPolicy" JSONB DEFAULT '{"maxRetries": 3, "backoffMs": [1000, 5000, 30000]}',

    -- Status tracking
    "status" TEXT DEFAULT 'active',          -- 'active' | 'failing' | 'disabled'
    "failureCount" INTEGER DEFAULT 0,
    "lastSuccessAt" TIMESTAMP,
    "lastFailureAt" TIMESTAMP,
    "lastErrorMessage" TEXT,

    "createdById" TEXT REFERENCES "user"("id"),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "webhook_endpoint_organizationId_idx" ON "webhook_endpoint"("organizationId");
CREATE INDEX "webhook_endpoint_status_idx" ON "webhook_endpoint"("status");
```

### Table: `webhook_delivery`
```sql
CREATE TABLE "webhook_delivery" (
    "id" TEXT PRIMARY KEY,
    "endpointId" TEXT NOT NULL REFERENCES "webhook_endpoint"("id") ON DELETE CASCADE,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,                 -- Idempotency key
    "payload" JSONB NOT NULL,
    "status" TEXT DEFAULT 'pending',         -- 'pending' | 'success' | 'failed' | 'retrying'
    "attempts" INTEGER DEFAULT 0,
    "nextRetryAt" TIMESTAMP,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP
);

CREATE INDEX "webhook_delivery_endpointId_createdAt_idx"
    ON "webhook_delivery"("endpointId", "createdAt" DESC);
CREATE INDEX "webhook_delivery_status_nextRetryAt_idx"
    ON "webhook_delivery"("status", "nextRetryAt")
    WHERE "status" = 'retrying';
```

---

## Payload Structure

### Standard Envelope
```json
{
  "id": "evt_01H5XYZABC123DEF",
  "type": "call.completed",
  "apiVersion": "v1",
  "createdAt": "2024-12-15T14:30:00Z",
  "organization": {
    "id": "org_123",
    "name": "Acme Corp"
  },
  "data": {
    // Event-specific payload
  }
}
```

### Event Payloads

#### `call.completed`
```json
{
  "id": "evt_01H5XYZABC123DEF",
  "type": "call.completed",
  "apiVersion": "v1",
  "createdAt": "2024-12-15T14:30:00Z",
  "organization": {
    "id": "org_123",
    "name": "Acme Corp"
  },
  "data": {
    "call": {
      "id": "call_abc123",
      "direction": "outbound",
      "fromNumber": "+15551234567",
      "toNumber": "+15559876543",
      "status": "completed",
      "duration": 272,
      "durationFormatted": "4m 32s",
      "startedAt": "2024-12-15T14:25:28Z",
      "answeredAt": "2024-12-15T14:25:35Z",
      "endedAt": "2024-12-15T14:30:00Z",
      "recordingUrl": "https://api.omnidial.io/calls/call_abc123/recording",
      "disposition": {
        "id": "disp_interested",
        "label": "Interested"
      }
    },
    "lead": {
      "id": "lead_xyz789",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@acme.com",
      "phone": "+15559876543",
      "company": "Acme Corp",
      "title": "VP of Sales"
    },
    "user": {
      "id": "user_rep123",
      "name": "Sarah Johnson",
      "email": "sarah@mycompany.com"
    },
    "campaign": {
      "id": "camp_q4outreach",
      "name": "Q4 Enterprise Outreach"
    }
  }
}
```

#### `lead.stage_changed`
```json
{
  "id": "evt_01H5XYZDEF456GHI",
  "type": "lead.stage_changed",
  "apiVersion": "v1",
  "createdAt": "2024-12-15T14:31:00Z",
  "organization": {
    "id": "org_123",
    "name": "Acme Corp"
  },
  "data": {
    "lead": {
      "id": "lead_xyz789",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@acme.com",
      "company": "Acme Corp",
      "dealValue": 50000
    },
    "previousStage": {
      "id": "stage_qualified",
      "label": "Qualified",
      "color": "#f59e0b"
    },
    "newStage": {
      "id": "stage_proposal",
      "label": "Proposal Sent",
      "color": "#3b82f6"
    },
    "changedBy": {
      "id": "user_rep123",
      "name": "Sarah Johnson"
    }
  }
}
```

---

## Webhook Signature Verification

All webhooks are signed using HMAC-SHA256.

### Headers
```http
X-OmniDial-Signature: sha256=a1b2c3d4e5f6...
X-OmniDial-Timestamp: 1702651800
X-OmniDial-Event: call.completed
X-OmniDial-Delivery-Id: del_abc123
```

### Verification Algorithm
```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Prevent replay attacks
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  // Constant-time comparison
  return timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`),
    Buffer.from(signature)
  )
}
```

### Example Verification (Node.js)
```javascript
const express = require('express')
const crypto = require('crypto')

app.post('/webhooks/omnidial', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-omnidial-signature']
  const timestamp = req.headers['x-omnidial-timestamp']

  const signedPayload = `${timestamp}.${req.body}`
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
    return res.status(401).send('Invalid signature')
  }

  const event = JSON.parse(req.body)
  console.log('Received event:', event.type)

  // Handle the event
  switch (event.type) {
    case 'call.completed':
      handleCallCompleted(event.data)
      break
    case 'lead.stage_changed':
      handleStageChange(event.data)
      break
  }

  res.status(200).send('OK')
})
```

---

## Retry Policy

### Default Retry Schedule
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 5 seconds delay
- Attempt 4: 30 seconds delay

### Success Criteria
- HTTP 2xx response within 30 seconds

### Failure Handling
- Non-2xx response: Retry
- Timeout (30s): Retry
- Connection error: Retry
- After max retries: Mark as failed, increment endpoint failure count

### Automatic Disabling
- 100 consecutive failures: Endpoint marked as `failing`
- Admin notified via email
- Can be re-enabled manually after fixing

---

## Admin UI

### Webhook Management Page
**Route:** `/dashboard/settings/webhooks`

```
┌─────────────────────────────────────────────────────────────┐
│  Webhooks                               [+ Create Webhook]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🟢 Salesforce Sync                                      ││
│  │    https://hooks.salesforce.com/services/...            ││
│  │    Events: call.completed, lead.stage_changed           ││
│  │    Last delivery: 2 minutes ago ✓                       ││
│  │                                        [Edit] [Delete]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🟡 Slack Notifications (failing)                        ││
│  │    https://hooks.slack.com/services/...                  ││
│  │    Events: call.completed                               ││
│  │    Last failure: 5 minutes ago - 502 Bad Gateway        ││
│  │                                [Retry] [Edit] [Delete]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚫ HubSpot Sync (disabled)                               ││
│  │    https://api.hubapi.com/webhooks/...                   ││
│  │    Events: lead.created, lead.updated                   ││
│  │                                [Enable] [Edit] [Delete] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Webhook Detail / Delivery History
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back   Salesforce Sync                                   │
│                                                             │
│  Endpoint URL:                                              │
│  https://hooks.salesforce.com/services/...                  │
│                                                             │
│  Signing Secret:  whsec_abc...xyz  [Reveal] [Rotate]        │
│                                                             │
│  Events:                                                    │
│  ☑ call.completed    ☑ lead.stage_changed                   │
│  ☐ call.started      ☐ lead.created                         │
│  ☐ call.answered     ☐ lead.updated                         │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  Recent Deliveries                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ call.completed      2024-12-15 14:30:00   245ms   │   │
│  │   del_abc123                                [View]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ✓ lead.stage_changed  2024-12-15 14:29:55   189ms   │   │
│  │   del_abc122                                [View]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ✗ call.completed      2024-12-15 14:28:30   Timeout │   │
│  │   del_abc121 - Retried 3x, failed          [View]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Send Test Event]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/endpoints` | GET | List webhook endpoints |
| `/webhooks/endpoints` | POST | Create webhook endpoint |
| `/webhooks/endpoints/:id` | GET | Get endpoint details |
| `/webhooks/endpoints/:id` | PATCH | Update endpoint |
| `/webhooks/endpoints/:id` | DELETE | Delete endpoint |
| `/webhooks/endpoints/:id/rotate-secret` | POST | Rotate signing secret |
| `/webhooks/endpoints/:id/test` | POST | Send test event |
| `/webhooks/endpoints/:id/deliveries` | GET | List deliveries |
| `/webhooks/deliveries/:id` | GET | Get delivery details |
| `/webhooks/deliveries/:id/retry` | POST | Retry failed delivery |

---

## Backend Implementation

### Event Dispatcher
```typescript
// services/webhook.service.ts
import { Queue } from 'bullmq'

const webhookQueue = new Queue('webhooks', { connection: redis })

export async function dispatchEvent(
  organizationId: string,
  eventType: string,
  data: unknown
): Promise<void> {
  const eventId = `evt_${nanoid()}`
  const event = {
    id: eventId,
    type: eventType,
    apiVersion: 'v1',
    createdAt: new Date().toISOString(),
    data,
  }

  // Find subscribed endpoints
  const endpoints = await webhookEndpointRepo.findByEvent(organizationId, eventType)

  for (const endpoint of endpoints) {
    if (!endpoint.enabled) continue

    // Create delivery record
    const deliveryId = await webhookDeliveryRepo.create({
      endpointId: endpoint.id,
      eventType,
      eventId,
      payload: event,
      status: 'pending',
    })

    // Queue for async delivery
    await webhookQueue.add('deliver', {
      deliveryId,
      endpointId: endpoint.id,
      attempt: 1,
    })
  }
}
```

### Delivery Worker
```typescript
// jobs/webhookDelivery.job.ts
import { Worker } from 'bullmq'

const worker = new Worker('webhooks', async (job) => {
  const { deliveryId, endpointId, attempt } = job.data

  const delivery = await webhookDeliveryRepo.findById(deliveryId)
  const endpoint = await webhookEndpointRepo.findById(endpointId)

  const signature = signPayload(
    JSON.stringify(delivery.payload),
    Math.floor(Date.now() / 1000),
    endpoint.secret
  )

  const startTime = Date.now()

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OmniDial-Signature': signature,
        'X-OmniDial-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'X-OmniDial-Event': delivery.eventType,
        'X-OmniDial-Delivery-Id': deliveryId,
        ...endpoint.headers,
      },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(30000),
    })

    const responseTime = Date.now() - startTime
    const responseBody = await response.text()

    if (response.ok) {
      await webhookDeliveryRepo.markSuccess(deliveryId, {
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 1000),
        responseTimeMs: responseTime,
      })
      await webhookEndpointRepo.recordSuccess(endpointId)
    } else {
      throw new WebhookError(response.status, responseBody)
    }
  } catch (error) {
    await handleDeliveryFailure(delivery, endpoint, attempt, error)
  }
}, { connection: redis })
```

---

## Zapier Integration

### Trigger Setup
OmniDial can be listed on Zapier as a trigger app.

**Zapier App Structure:**
```javascript
// triggers/call_completed.js
module.exports = {
  key: 'call_completed',
  noun: 'Call',
  display: {
    label: 'Call Completed',
    description: 'Triggers when a call ends.',
  },
  operation: {
    type: 'hook',
    performSubscribe: async (z, bundle) => {
      const response = await z.request({
        url: 'https://api.omnidial.io/webhooks/endpoints',
        method: 'POST',
        body: {
          name: 'Zapier',
          url: bundle.targetUrl,
          events: ['call.completed'],
        },
      })
      return response.data
    },
    performUnsubscribe: async (z, bundle) => {
      await z.request({
        url: `https://api.omnidial.io/webhooks/endpoints/${bundle.subscribeData.id}`,
        method: 'DELETE',
      })
    },
    perform: async (z, bundle) => {
      return [bundle.cleanedRequest]
    },
    sample: {
      id: 'call_abc123',
      type: 'call.completed',
      // ... sample data
    },
  },
}
```

---

## Rate Limits

- **Max endpoints per organization:** 10
- **Max events per endpoint:** All events or subset
- **Delivery timeout:** 30 seconds
- **Max payload size:** 1MB
- **Max retries:** 3 (configurable)
