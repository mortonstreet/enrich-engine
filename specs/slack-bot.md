# OmniDial Slack Bot Specification

## Overview

OmniDial Slack Bot is an intelligent companion app that brings real-time sales intelligence, call analytics, lead data, and team notifications directly into Slack workspaces. Designed for publication on the Slack App Directory.

---

## Product Vision

### Value Proposition
- **Real-time Awareness**: Instant notifications for inbound calls, milestones, and team activity
- **Data at Fingertips**: Query leads, calls, and analytics without leaving Slack
- **Team Alignment**: Shared leaderboards, daily digests, and collaborative insights
- **AI-Powered Insights**: Natural language queries and intelligent summaries

### Target Users
- Sales Development Representatives (SDRs)
- Account Executives (AEs)
- Sales Managers
- Revenue Operations Teams

---

## Slack App Configuration

### App Manifest (app-manifest.yaml)
```yaml
display_information:
  name: OmniDial
  description: Real-time sales intelligence and call analytics for your team
  background_color: "#4F46E5"
  long_description: |
    OmniDial brings your sales data directly into Slack. Get instant notifications
    for inbound calls, query lead information, view team analytics, and stay aligned
    with daily performance digests.

    Features:
    • Real-time inbound call alerts
    • Lead search and lookup
    • Call analytics and metrics
    • Team leaderboards
    • Daily/weekly performance digests
    • Call recording access
    • Sales coaching insights

features:
  bot_user:
    display_name: OmniDial
    always_online: true
  slash_commands:
    - command: /omnidial
      description: OmniDial commands - type /omnidial help for options
      usage_hint: "[stats|lead|calls|leaderboard|coaching|recording|settings]"
      should_escape: false
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - chat:write.public
      - commands
      - files:write
      - groups:history
      - groups:read
      - im:history
      - im:read
      - im:write
      - mpim:history
      - mpim:read
      - reactions:read
      - reactions:write
      - team:read
      - users:read
      - users:read.email

settings:
  event_subscriptions:
    bot_events:
      - app_home_opened
      - app_mention
      - message.channels
      - message.groups
      - message.im
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: false
```

### Required Slack Scopes Explained
| Scope | Purpose |
|-------|---------|
| `chat:write` | Send notifications and command responses |
| `commands` | Handle /omnidial slash commands |
| `users:read.email` | Link Slack users to OmniDial accounts |
| `app_mentions:read` | Respond when @mentioned |
| `files:write` | Share call recordings and exports |

---

## Database Schema

### Table: `slack_workspace`
Stores connected Slack workspace information.

```sql
CREATE TABLE "slack_workspace" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "teamId" TEXT NOT NULL UNIQUE,           -- Slack workspace ID (T01234567)
    "teamName" TEXT NOT NULL,                -- Workspace name
    "teamDomain" TEXT,                       -- Workspace domain (company.slack.com)
    "botToken" TEXT NOT NULL,                -- Encrypted xoxb-... token
    "botUserId" TEXT NOT NULL,               -- Bot's Slack user ID
    "appId" TEXT NOT NULL,                   -- Slack App ID
    "enterpriseId" TEXT,                     -- For Enterprise Grid
    "enterpriseName" TEXT,
    "installedById" TEXT REFERENCES "user"("id"),
    "installedBySlackId" TEXT,
    "defaultChannelId" TEXT,                 -- Default channel for notifications
    "settings" JSONB DEFAULT '{}',           -- Notification preferences
    "isActive" BOOLEAN DEFAULT true,
    "lastActivityAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "slack_workspace_organizationId_idx" ON "slack_workspace"("organizationId");
CREATE INDEX "slack_workspace_teamId_idx" ON "slack_workspace"("teamId");
```

### Table: `slack_user_link`
Links OmniDial users to their Slack identities.

```sql
CREATE TABLE "slack_user_link" (
    "id" TEXT PRIMARY KEY,
    "workspaceId" TEXT NOT NULL REFERENCES "slack_workspace"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "slackUserId" TEXT NOT NULL,             -- Slack user ID (U01234567)
    "slackEmail" TEXT,                       -- Email from Slack profile
    "slackDisplayName" TEXT,
    "slackRealName" TEXT,
    "slackTimezone" TEXT,
    "notificationsEnabled" BOOLEAN DEFAULT true,
    "dmChannelId" TEXT,                      -- Cached DM channel ID
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE("workspaceId", "userId"),
    UNIQUE("workspaceId", "slackUserId")
);

CREATE INDEX "slack_user_link_userId_idx" ON "slack_user_link"("userId");
CREATE INDEX "slack_user_link_slackUserId_idx" ON "slack_user_link"("slackUserId");
```

### Table: `slack_notification_rule`
Configurable notification rules per channel/workspace.

```sql
CREATE TABLE "slack_notification_rule" (
    "id" TEXT PRIMARY KEY,
    "workspaceId" TEXT NOT NULL REFERENCES "slack_workspace"("id") ON DELETE CASCADE,
    "channelId" TEXT NOT NULL,               -- Slack channel ID
    "channelName" TEXT,                      -- Cached channel name
    "eventType" TEXT NOT NULL,               -- Event type (see enum below)
    "enabled" BOOLEAN DEFAULT true,
    "config" JSONB DEFAULT '{}',             -- Event-specific config
    "createdById" TEXT REFERENCES "user"("id"),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE("workspaceId", "channelId", "eventType")
);

CREATE INDEX "slack_notification_rule_workspaceId_idx" ON "slack_notification_rule"("workspaceId");
CREATE INDEX "slack_notification_rule_eventType_idx" ON "slack_notification_rule"("eventType");
```

**Event Types Enum:**
```typescript
type SlackEventType =
  | 'inbound_call'           // Real-time inbound call alerts
  | 'call_completed'         // Call completion with disposition
  | 'milestone_reached'      // "100 calls today!" type alerts
  | 'daily_summary'          // End of day digest
  | 'weekly_summary'         // Weekly performance report
  | 'lead_created'           // New lead added
  | 'deal_won'               // Pipeline stage: Won
  | 'deal_lost'              // Pipeline stage: Lost
  | 'coaching_available'     // New coaching feedback ready
  | 'rep_activity'           // Manager oversight alerts
```

### Table: `slack_message_log`
Audit log of messages sent (for debugging and rate limiting).

```sql
CREATE TABLE "slack_message_log" (
    "id" TEXT PRIMARY KEY,
    "workspaceId" TEXT NOT NULL REFERENCES "slack_workspace"("id") ON DELETE CASCADE,
    "channelId" TEXT NOT NULL,
    "messageTs" TEXT,                        -- Slack message timestamp
    "eventType" TEXT,
    "payload" JSONB,                         -- Message content sent
    "success" BOOLEAN DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "slack_message_log_workspaceId_createdAt_idx"
    ON "slack_message_log"("workspaceId", "createdAt" DESC);
```

---

## Slash Commands

### Command Structure
All commands use `/omnidial` as the base with subcommands:

```
/omnidial [subcommand] [arguments]
```

### Available Commands

#### `/omnidial stats [period]`
Display call metrics for the team or user.

**Arguments:**
- `period`: `today` | `week` | `month` | `quarter` (default: `today`)
- `@user`: Filter to specific team member

**Response (Block Kit):**
```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "📊 Call Stats - Today" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Total Calls*\n247" },
        { "type": "mrkdwn", "text": "*Connected*\n89 (36%)" },
        { "type": "mrkdwn", "text": "*Outbound*\n201" },
        { "type": "mrkdwn", "text": "*Inbound*\n46" },
        { "type": "mrkdwn", "text": "*Talk Time*\n4h 23m" },
        { "type": "mrkdwn", "text": "*Avg Duration*\n2m 45s" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "📈 +12% vs yesterday" }
      ]
    }
  ]
}
```

#### `/omnidial lead [query|id]`
Search for leads or get detailed lead information.

**Usage:**
- `/omnidial lead John Smith` - Search by name
- `/omnidial lead acme corp` - Search by company
- `/omnidial lead +1555123456` - Search by phone
- `/omnidial lead abc123` - Get lead by ID

**Response:**
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*John Smith*\nVP of Sales at Acme Corp"
      },
      "accessory": {
        "type": "button",
        "text": { "type": "plain_text", "text": "View in OmniDial" },
        "url": "https://app.omnidial.io/dashboard/leads/abc123"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Phone*\n+1 (555) 123-4567" },
        { "type": "mrkdwn", "text": "*Email*\njohn@acme.com" },
        { "type": "mrkdwn", "text": "*Stage*\n🟡 Qualified" },
        { "type": "mrkdwn", "text": "*Deal Value*\n$50,000" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "📞 Call" },
          "action_id": "call_lead",
          "value": "abc123"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "📝 Add Note" },
          "action_id": "add_note",
          "value": "abc123"
        }
      ]
    }
  ]
}
```

#### `/omnidial calls [filters]`
List recent calls with optional filters.

**Arguments:**
- `--limit N` or `-n N`: Number of calls (default: 5, max: 20)
- `--direction inbound|outbound`: Filter by direction
- `--user @mention`: Filter by team member
- `--lead [name]`: Filter by lead

**Example:**
```
/omnidial calls --limit 10 --direction inbound
```

#### `/omnidial leaderboard [period]`
Show team performance rankings.

**Arguments:**
- `period`: `today` | `week` | `month` (default: `week`)
- `--metric`: `calls` | `connected` | `talk_time` (default: `connected`)

**Response:**
```
🏆 Leaderboard - This Week (by Connected Calls)

1. 🥇 Sarah Johnson    89 connected  (142 total)
2. 🥈 Mike Chen        76 connected  (128 total)
3. 🥉 Alex Rivera      71 connected  (115 total)
4.    Chris Taylor     68 connected  (110 total)
5.    Jordan Lee       52 connected  (98 total)

Team Total: 356 connected / 593 calls (60% rate)
```

#### `/omnidial coaching [call_id]`
Get sales coaching insights for a call.

**Usage:**
- `/omnidial coaching` - List recent coaching sessions
- `/omnidial coaching abc123` - Get coaching for specific call

#### `/omnidial recording [call_id]`
Get a secure link to a call recording.

**Response:**
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "🎙️ *Call Recording*\nJohn Smith → +1 (555) 123-4567\nDuration: 4m 32s | Dec 15, 2024"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "▶️ Play Recording" },
          "url": "https://app.omnidial.io/calls/abc123/recording",
          "style": "primary"
        }
      ]
    }
  ],
  "response_type": "ephemeral"
}
```

#### `/omnidial settings`
Configure Slack integration settings.

**Opens Modal with:**
- Default notification channel
- Notification preferences (toggles for each event type)
- User linking status
- Timezone settings

#### `/omnidial help`
Show available commands and usage.

---

## Real-Time Notifications

### Inbound Call Alert
Triggered immediately when an inbound call is received.

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "📞 Incoming Call", "emoji": true }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*John Smith* from *Acme Corp*\n📱 +1 (555) 123-4567"
      },
      "accessory": {
        "type": "image",
        "image_url": "https://ui-avatars.com/api/?name=John+Smith&background=4F46E5&color=fff",
        "alt_text": "John Smith"
      }
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "🎯 Lead Stage: Qualified | 💰 Deal: $50,000" },
        { "type": "mrkdwn", "text": "📞 Last Call: 3 days ago | 📝 2 notes" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View Lead" },
          "url": "https://app.omnidial.io/dashboard/leads/abc123",
          "style": "primary"
        }
      ]
    }
  ]
}
```

### Call Completed Alert
Sent after a call ends with key details.

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "✅ *Call Completed*\n<@U123ABC> finished a call with *John Smith*"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Duration*\n4m 32s" },
        { "type": "mrkdwn", "text": "*Disposition*\n🟢 Interested" },
        { "type": "mrkdwn", "text": "*Direction*\nOutbound" },
        { "type": "mrkdwn", "text": "*Recording*\n<link|Listen>" }
      ]
    }
  ]
}
```

### Milestone Alert
Celebrate team achievements.

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🎉 Milestone Reached!", "emoji": true }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "The team just crossed *500 calls* this week!\n\nTop contributor: <@U123ABC> with 87 calls 🏆"
      }
    }
  ]
}
```

### Daily Summary
Automated end-of-day digest (configurable time).

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "📊 Daily Summary - Dec 15, 2024" }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Team Performance*"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Total Calls*\n247 (+12%)" },
        { "type": "mrkdwn", "text": "*Connected*\n89 (36%)" },
        { "type": "mrkdwn", "text": "*Talk Time*\n4h 23m" },
        { "type": "mrkdwn", "text": "*New Leads*\n15" }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*🏆 Top Performers*\n1. Sarah Johnson - 32 connected\n2. Mike Chen - 28 connected\n3. Alex Rivera - 24 connected"
      }
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "View full analytics in <https://app.omnidial.io/dashboard|OmniDial>" }
      ]
    }
  ]
}
```

---

## Interactive Components

### App Home Tab
Personalized dashboard when user opens the app home.

**Sections:**
1. **My Stats Today** - Personal call metrics
2. **Recent Calls** - Last 5 calls with quick actions
3. **Upcoming Tasks** - Scheduled callbacks
4. **Quick Actions** - Start dialing, search leads

### Button Actions
| Action ID | Description |
|-----------|-------------|
| `call_lead` | Open dialer with lead pre-filled |
| `view_lead` | Open lead detail page |
| `add_note` | Open note modal |
| `view_recording` | Open recording player |
| `get_coaching` | Trigger coaching generation |
| `refresh_stats` | Refresh current view |

### Modal: Add Note
```json
{
  "type": "modal",
  "title": { "type": "plain_text", "text": "Add Note" },
  "submit": { "type": "plain_text", "text": "Save" },
  "blocks": [
    {
      "type": "input",
      "block_id": "note_content",
      "label": { "type": "plain_text", "text": "Note" },
      "element": {
        "type": "plain_text_input",
        "action_id": "note_text",
        "multiline": true,
        "placeholder": { "type": "plain_text", "text": "Enter your note..." }
      }
    }
  ]
}
```

---

## Backend Architecture

### File Structure
```
backend/src/
├── api/
│   ├── routes/
│   │   └── webhooks/
│   │       └── slack.ts           # Slack event handlers
│   └── controllers/
│       └── slack.controller.ts     # Slash command handlers
├── services/
│   └── slack.service.ts           # Core Slack logic
├── repositories/
│   ├── slackWorkspace.repository.ts
│   ├── slackUserLink.repository.ts
│   └── slackNotificationRule.repository.ts
├── clients/
│   └── slack.client.ts            # Slack Web API wrapper
└── jobs/
    └── slackDigest.job.ts         # Scheduled digests
```

### Slack Client (`slack.client.ts`)
```typescript
import { WebClient } from '@slack/web-api'
import { decrypt } from '@/lib/encryption'

export class SlackClient {
  private client: WebClient

  constructor(encryptedToken: string) {
    const token = decrypt(encryptedToken)
    this.client = new WebClient(token)
  }

  async postMessage(channel: string, blocks: Block[], text?: string) {
    return this.client.chat.postMessage({
      channel,
      blocks,
      text: text || 'OmniDial notification',
    })
  }

  async postEphemeral(channel: string, user: string, blocks: Block[]) {
    return this.client.chat.postEphemeral({
      channel,
      user,
      blocks,
    })
  }

  async openModal(triggerId: string, view: ModalView) {
    return this.client.views.open({
      trigger_id: triggerId,
      view,
    })
  }

  async updateAppHome(userId: string, view: HomeView) {
    return this.client.views.publish({
      user_id: userId,
      view,
    })
  }

  async getUserInfo(userId: string) {
    return this.client.users.info({ user: userId })
  }

  async listConversations() {
    return this.client.conversations.list({
      types: 'public_channel,private_channel',
    })
  }
}
```

### Webhook Handler (`slack.ts`)
```typescript
import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import * as slackController from '@/api/controllers/slack.controller'

const router = Router()

// Verify Slack request signature
const verifySlackSignature = (req, res, next) => {
  const signature = req.headers['x-slack-signature']
  const timestamp = req.headers['x-slack-request-timestamp']
  const body = req.rawBody

  // Check timestamp to prevent replay attacks
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    return res.status(400).json({ error: 'Request too old' })
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
    .update(sigBasestring)
    .digest('hex')

  if (!timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  next()
}

// OAuth callback
router.get('/oauth/callback', slackController.handleOAuthCallback)

// All other routes require signature verification
router.use(verifySlackSignature)

// Slack Events API
router.post('/events', slackController.handleEvent)

// Slash commands
router.post('/commands', slackController.handleCommand)

// Interactive components (buttons, modals)
router.post('/interactions', slackController.handleInteraction)

export default router
```

### Service Layer (`slack.service.ts`)
```typescript
import { SlackClient } from '@/clients/slack.client'
import * as workspaceRepo from '@/repositories/slackWorkspace.repository'
import * as userLinkRepo from '@/repositories/slackUserLink.repository'
import * as notificationRepo from '@/repositories/slackNotificationRule.repository'
import * as analyticsService from '@/services/analytics.service'
import * as leadRepo from '@/repositories/lead.repository'
import * as callRepo from '@/repositories/call.repository'

export async function handleStatsCommand(
  workspaceId: string,
  userId: string,
  args: string[]
): Promise<SlackBlocks> {
  const workspace = await workspaceRepo.findById(workspaceId)
  const organizationId = workspace.organizationId

  const period = args[0] || 'today'
  const { startDate, endDate } = getPeriodDates(period)

  const analytics = await analyticsService.getCallAnalytics({
    organizationId,
    startDate,
    endDate,
  })

  return buildStatsBlocks(analytics, period)
}

export async function handleLeadSearch(
  workspaceId: string,
  query: string
): Promise<SlackBlocks> {
  const workspace = await workspaceRepo.findById(workspaceId)
  const leads = await leadRepo.findMany(
    { organizationId: workspace.organizationId, search: query },
    { page: 1, limit: 5 }
  )

  return buildLeadSearchResultsBlocks(leads.data)
}

export async function sendInboundCallNotification(
  organizationId: string,
  call: Call,
  lead: Lead | null
): Promise<void> {
  const workspaces = await workspaceRepo.findByOrganization(organizationId)

  for (const workspace of workspaces) {
    const rules = await notificationRepo.findByEventType(
      workspace.id,
      'inbound_call'
    )

    if (rules.length === 0) continue

    const client = new SlackClient(workspace.botToken)
    const blocks = buildInboundCallBlocks(call, lead)

    for (const rule of rules) {
      if (rule.enabled) {
        await client.postMessage(rule.channelId, blocks)
      }
    }
  }
}

export async function sendDailySummary(workspaceId: string): Promise<void> {
  const workspace = await workspaceRepo.findById(workspaceId)
  const rules = await notificationRepo.findByEventType(workspaceId, 'daily_summary')

  if (rules.length === 0) return

  const analytics = await analyticsService.getCallAnalytics({
    organizationId: workspace.organizationId,
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
  })

  const leaderboard = await analyticsService.getLeaderboard({
    organizationId: workspace.organizationId,
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
    limit: 3,
  })

  const client = new SlackClient(workspace.botToken)
  const blocks = buildDailySummaryBlocks(analytics, leaderboard)

  for (const rule of rules) {
    if (rule.enabled) {
      await client.postMessage(rule.channelId, blocks)
    }
  }
}
```

---

## OAuth Flow

### Installation URL
```
https://slack.com/oauth/v2/authorize?
  client_id={SLACK_CLIENT_ID}&
  scope=chat:write,commands,users:read.email,...&
  redirect_uri=https://api.omnidial.io/webhooks/slack/oauth/callback&
  state={encrypted_org_id}
```

### OAuth Callback Handler
```typescript
export async function handleOAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query

  // Decrypt state to get organizationId
  const organizationId = decrypt(state as string)

  // Exchange code for token
  const result = await slackWebClient.oauth.v2.access({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    code: code as string,
    redirect_uri: 'https://api.omnidial.io/webhooks/slack/oauth/callback',
  })

  // Store workspace connection
  await workspaceRepo.create({
    organizationId,
    teamId: result.team.id,
    teamName: result.team.name,
    botToken: encrypt(result.access_token),
    botUserId: result.bot_user_id,
    appId: result.app_id,
    installedBySlackId: result.authed_user.id,
  })

  // Redirect to success page
  res.redirect('https://app.omnidial.io/dashboard/settings/integrations?slack=connected')
}
```

---

## Environment Variables

```env
# Slack App Credentials
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret

# Optional: App-Level Token for Socket Mode (dev only)
SLACK_APP_TOKEN=xapp-...
```

---

## Rate Limiting & Best Practices

### Slack API Rate Limits
- Tier 1 (chat.postMessage): ~1 request/second
- Tier 2 (conversations.list): ~20 requests/minute
- Tier 3 (users.info): ~50 requests/minute

### Implementation Guidelines
1. **Queue notifications** - Use a job queue for high-volume events
2. **Batch messages** - Combine multiple events into single messages when possible
3. **Cache user data** - Store Slack user info locally, refresh periodically
4. **Handle rate limit errors** - Implement exponential backoff with `retry-after` header
5. **Use unfurl_links: false** - Prevent link previews in notifications

---

## Testing

### Local Development
1. Use ngrok to expose local server
2. Configure Slack app with ngrok URL
3. Use Slack's Request URL verification

### Test Workspace
Create a dedicated Slack workspace for testing with:
- Test channels for each notification type
- Test users linked to dev accounts
- Sandbox mode flag in workspace settings

---

## Slack App Store Submission Checklist

- [ ] App name and branding approved
- [ ] Long description complete
- [ ] Screenshots of key features
- [ ] Privacy policy URL
- [ ] Support email/URL
- [ ] OAuth scopes justified
- [ ] Security review passed
- [ ] Rate limit compliance verified
- [ ] GDPR/data retention documented
