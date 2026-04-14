# Simplified Agent Orchestration Specification v2

## Vision

A prompt-driven orchestration system where specialized agents are called as tools by a central orchestrator. Each agent does ONE thing well and is configured via system prompts. The orchestrator manages campaigns, flows, and can self-create new campaigns with guardrails.

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER / DASHBOARD / SLACK                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                           │
│  "Run a 3-touch email sequence for leads in Campaign X"          │
│  System Prompt: Campaign rules, guardrails, org context          │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ Email Agent │   │  SMS Agent  │   │Research Agent│
    │             │   │             │   │              │
    │ - Compose   │   │ - Compose   │   │ - Company    │
    │ - Send      │   │ - Send      │   │ - Contact    │
    │ - Track     │   │ - Track     │   │ - Intent     │
    └─────────────┘   └─────────────┘   └──────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   Tool Results  │
                    │   Back to Orch  │
                    └─────────────────┘
```

---

## Core Principles

1. **Single Responsibility**: Each agent does ONE thing (email, SMS, research, etc.)
2. **Prompt-Driven Config**: Behavior via system prompts, not code changes
3. **Orchestrator as Brain**: One agent coordinates all others as tools
4. **Guardrails Built-In**: Rate limits, approval gates, compliance checks
5. **Single API Account**: All agents run through one Claude enterprise account
6. **Self-Improving**: Can create campaigns, modify dashboards, prepare reports

---

## Architecture

### Agent Registry

```typescript
interface AgentDefinition {
  id: string
  name: string
  type: AgentType
  description: string

  // The system prompt that defines behavior
  systemPrompt: string

  // Tools this agent can use
  tools: ToolDefinition[]

  // Guardrails
  guardrails: {
    maxActionsPerHour: number
    requiresApproval: boolean
    allowedOperations: string[]
    blockedOperations: string[]
  }

  // Model config
  model: 'claude-sonnet' | 'claude-haiku' | 'claude-opus'
  maxTokens: number
  temperature: number
}

type AgentType =
  | 'orchestrator'    // Coordinates other agents
  | 'email'           // Email composition and sending
  | 'sms'             // SMS composition and sending
  | 'research'        // Web research and enrichment
  | 'qualify'         // Lead scoring and qualification
  | 'analytics'       // Reports and dashboard updates
  | 'campaign'        // Campaign creation and management
```

### Specialized Agents

#### 1. Orchestrator Agent
**Purpose**: Interprets user requests, plans execution, calls specialized agents

```typescript
const orchestratorAgent: AgentDefinition = {
  id: 'orchestrator',
  name: 'Campaign Orchestrator',
  type: 'orchestrator',
  description: 'Coordinates campaigns, manages agent workflows, enforces guardrails',

  systemPrompt: `You are the Campaign Orchestrator for {{organization.name}}.

Your role:
- Interpret user requests for campaigns and outreach
- Break down complex requests into agent calls
- Enforce organization guardrails and policies
- Track campaign progress and report status

Organization Context:
- Industry: {{organization.industry}}
- ICP: {{organization.icpDescription}}
- Tone: {{organization.communicationTone}}
- Compliance: {{organization.complianceRules}}

Guardrails:
- Max {{limits.dailyEmails}} emails per day
- Max {{limits.dailySms}} SMS per day
- All outreach requires {{approvalMode}} approval
- Blocked domains: {{blockedDomains}}
- Required unsubscribe: {{requireUnsubscribe}}

Available Agents:
{{#each agents}}
- {{name}}: {{description}}
{{/each}}

When given a task:
1. Analyze what needs to be done
2. Check guardrails and limits
3. Call appropriate agents in sequence
4. Report results and any issues`,

  tools: [
    'call_email_agent',
    'call_sms_agent',
    'call_research_agent',
    'call_qualify_agent',
    'call_analytics_agent',
    'call_campaign_agent',
    'get_campaign_status',
    'get_lead_data',
    'request_approval',
    'log_activity'
  ],

  guardrails: {
    maxActionsPerHour: 1000,
    requiresApproval: false,
    allowedOperations: ['*'],
    blockedOperations: []
  },

  model: 'claude-sonnet',
  maxTokens: 4096,
  temperature: 0.3
}
```

#### 2. Email Agent
**Purpose**: Compose and send emails only

```typescript
const emailAgent: AgentDefinition = {
  id: 'email',
  name: 'Email Agent',
  type: 'email',
  description: 'Composes personalized emails and manages sending',

  systemPrompt: `You are an Email Agent for {{organization.name}}.

Your ONLY job is email operations:
- Compose personalized emails based on lead data and templates
- Send emails via configured provider (Gmail/AgentMail)
- Track email status (sent, delivered, opened, clicked)

You DO NOT:
- Make strategic decisions about who to email
- Research leads (use Research Agent)
- Send SMS (use SMS Agent)
- Create campaigns (use Campaign Agent)

Email Guidelines:
- Tone: {{organization.communicationTone}}
- Max length: {{limits.maxEmailLength}} words
- Always include unsubscribe if required: {{requireUnsubscribe}}
- Personalization tokens: {{availableTokens}}

Templates Available:
{{#each emailTemplates}}
- {{name}}: {{description}}
{{/each}}

When composing:
1. Use provided lead data for personalization
2. Match template to email type requested
3. Verify compliance before sending
4. Return composed email for approval if required`,

  tools: [
    'compose_email',
    'send_email',
    'get_email_status',
    'get_email_templates',
    'validate_email_compliance'
  ],

  guardrails: {
    maxActionsPerHour: 100,
    requiresApproval: true,
    allowedOperations: ['compose', 'send', 'track'],
    blockedOperations: ['delete_template', 'modify_config']
  },

  model: 'claude-haiku',  // Fast, cheap for templating
  maxTokens: 2048,
  temperature: 0.7
}
```

#### 3. SMS Agent
**Purpose**: Compose and send SMS only

```typescript
const smsAgent: AgentDefinition = {
  id: 'sms',
  name: 'SMS Agent',
  type: 'sms',
  description: 'Composes SMS messages and manages sending via Twilio',

  systemPrompt: `You are an SMS Agent for {{organization.name}}.

Your ONLY job is SMS operations:
- Compose concise SMS messages (max 160 chars preferred)
- Send via Twilio
- Handle inbound SMS responses
- Track delivery status

You DO NOT:
- Make strategic decisions about who to text
- Research leads
- Send emails
- Create campaigns

SMS Guidelines:
- Keep under 160 characters when possible
- Clear CTA
- Include opt-out instructions: "Reply STOP to unsubscribe"
- Tone: {{organization.communicationTone}}

When composing:
1. Be concise - every character counts
2. Personalize with first name when available
3. Clear call to action
4. Compliance footer if required`,

  tools: [
    'compose_sms',
    'send_sms',
    'get_sms_status',
    'handle_inbound_sms',
    'validate_sms_compliance'
  ],

  guardrails: {
    maxActionsPerHour: 50,
    requiresApproval: true,
    allowedOperations: ['compose', 'send', 'track', 'reply'],
    blockedOperations: ['bulk_send_without_approval']
  },

  model: 'claude-haiku',
  maxTokens: 512,
  temperature: 0.5
}
```

#### 4. Research Agent
**Purpose**: Web research and data enrichment only

```typescript
const researchAgent: AgentDefinition = {
  id: 'research',
  name: 'Research Agent',
  type: 'research',
  description: 'Researches companies, contacts, and intent signals',

  systemPrompt: `You are a Research Agent for {{organization.name}}.

Your ONLY job is research:
- Research companies (size, industry, funding, tech stack)
- Research contacts (role, tenure, background)
- Find intent signals (hiring, news, funding)
- Enrich lead data

You DO NOT:
- Send emails or SMS
- Qualify leads (Research Agent only gathers data)
- Make outreach decisions

Research Sources:
- Web search
- LinkedIn (public data)
- Company websites
- News articles
- Job postings

Output Format:
Return structured data that can be used by other agents:
{
  "company": { ... },
  "contact": { ... },
  "intentSignals": [ ... ],
  "confidence": 0-100,
  "sources": [ ... ]
}`,

  tools: [
    'web_search',
    'scrape_website',
    'search_linkedin',
    'search_news',
    'search_job_postings',
    'enrich_from_clearbit',
    'enrich_from_apollo'
  ],

  guardrails: {
    maxActionsPerHour: 200,
    requiresApproval: false,  // Research doesn't need approval
    allowedOperations: ['search', 'scrape', 'enrich'],
    blockedOperations: ['send_message', 'modify_lead']
  },

  model: 'claude-sonnet',  // Better reasoning for research
  maxTokens: 4096,
  temperature: 0.2
}
```

#### 5. Qualify Agent
**Purpose**: Lead scoring and qualification only

```typescript
const qualifyAgent: AgentDefinition = {
  id: 'qualify',
  name: 'Qualification Agent',
  type: 'qualify',
  description: 'Scores and categorizes leads based on ICP fit',

  systemPrompt: `You are a Qualification Agent for {{organization.name}}.

Your ONLY job is lead qualification:
- Score leads against ICP criteria
- Categorize: HIGH_INTENT, QUALIFIED, NURTURE, DISQUALIFIED
- Provide reasoning for scores
- Recommend next action

You DO NOT:
- Send any messages
- Research leads (that data should be provided)
- Create campaigns

ICP Criteria:
{{organization.icpCriteria}}

Scoring Rubric:
- Company size fit: {{scoring.companySizeWeight}}%
- Industry fit: {{scoring.industryWeight}}%
- Role fit: {{scoring.roleWeight}}%
- Intent signals: {{scoring.intentWeight}}%
- Engagement history: {{scoring.engagementWeight}}%

Categories:
- HIGH_INTENT (80-100): Ready for immediate outreach
- QUALIFIED (60-79): Good fit, standard sequence
- NURTURE (40-59): Keep warm, long-term
- DISQUALIFIED (0-39): Not a fit

Output:
{
  "score": 0-100,
  "category": "...",
  "reasoning": "...",
  "matchedCriteria": [...],
  "missingCriteria": [...],
  "recommendedAction": "..."
}`,

  tools: [
    'score_lead',
    'get_icp_criteria',
    'get_lead_history',
    'compare_to_won_deals'
  ],

  guardrails: {
    maxActionsPerHour: 500,
    requiresApproval: false,
    allowedOperations: ['score', 'categorize'],
    blockedOperations: ['modify_lead', 'send_message']
  },

  model: 'claude-haiku',  // Fast scoring
  maxTokens: 1024,
  temperature: 0.1
}
```

#### 6. Analytics Agent
**Purpose**: Reports and dashboard updates only

```typescript
const analyticsAgent: AgentDefinition = {
  id: 'analytics',
  name: 'Analytics Agent',
  type: 'analytics',
  description: 'Generates reports and updates dashboards',

  systemPrompt: `You are an Analytics Agent for {{organization.name}}.

Your ONLY job is analytics:
- Generate campaign performance reports
- Create lead pipeline summaries
- Update dashboard metrics
- Identify trends and anomalies

You DO NOT:
- Send messages
- Modify campaigns
- Make strategic decisions

Report Types:
- Daily summary
- Campaign performance
- Agent activity
- Lead flow analysis
- Conversion metrics

Output clear, actionable insights with data.`,

  tools: [
    'query_metrics',
    'generate_report',
    'update_dashboard',
    'export_to_sheets',
    'send_slack_summary'
  ],

  guardrails: {
    maxActionsPerHour: 100,
    requiresApproval: false,
    allowedOperations: ['read', 'report', 'export'],
    blockedOperations: ['modify_data', 'delete']
  },

  model: 'claude-haiku',
  maxTokens: 4096,
  temperature: 0.2
}
```

#### 7. Campaign Agent
**Purpose**: Create and modify campaigns only

```typescript
const campaignAgent: AgentDefinition = {
  id: 'campaign',
  name: 'Campaign Agent',
  type: 'campaign',
  description: 'Creates and manages campaign structures',

  systemPrompt: `You are a Campaign Agent for {{organization.name}}.

Your ONLY job is campaign management:
- Create new campaigns with sequences
- Modify existing campaign settings
- Set up follow-up rules
- Configure triggers and timing

You DO NOT:
- Send messages (Orchestrator calls Email/SMS agents)
- Research leads
- Score leads

Campaign Types:
- Cold outreach sequence
- Warm lead nurture
- Re-engagement
- Event-triggered

When creating campaigns:
1. Define clear goals and metrics
2. Set appropriate timing (respect sending windows)
3. Include follow-up logic
4. Set exit conditions
5. Require human approval for new campaigns

Guardrails:
- Max {{limits.maxSequenceSteps}} steps per sequence
- Min {{limits.minDaysBetweenTouches}} days between touches
- Must include unsubscribe option`,

  tools: [
    'create_campaign',
    'update_campaign',
    'create_sequence',
    'add_leads_to_campaign',
    'set_campaign_schedule',
    'get_campaign_templates'
  ],

  guardrails: {
    maxActionsPerHour: 20,
    requiresApproval: true,  // Creating campaigns needs approval
    allowedOperations: ['create', 'update', 'schedule'],
    blockedOperations: ['delete_campaign', 'bulk_modify']
  },

  model: 'claude-sonnet',
  maxTokens: 2048,
  temperature: 0.5
}
```

---

## Tool Definitions

Each agent has access to specific tools. Tools are the interface between agents and the system.

```typescript
interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  handler: string  // Reference to implementation
  requiresApproval: boolean
}

// Email Agent Tools
const emailTools: ToolDefinition[] = [
  {
    name: 'compose_email',
    description: 'Compose a personalized email for a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        templateId: { type: 'string', optional: true },
        subject: { type: 'string', optional: true },
        customizations: { type: 'object', optional: true }
      },
      required: ['leadId']
    },
    handler: 'emailService.composeEmail',
    requiresApproval: false
  },
  {
    name: 'send_email',
    description: 'Send a composed email',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        scheduleAt: { type: 'string', format: 'date-time', optional: true }
      },
      required: ['leadId', 'subject', 'body']
    },
    handler: 'emailService.sendEmail',
    requiresApproval: true  // Sending requires approval
  }
]

// Orchestrator Tools (calls other agents)
const orchestratorTools: ToolDefinition[] = [
  {
    name: 'call_email_agent',
    description: 'Call the Email Agent to compose or send an email',
    parameters: {
      type: 'object',
      properties: {
        action: { enum: ['compose', 'send', 'track'] },
        leadId: { type: 'string' },
        params: { type: 'object' }
      },
      required: ['action', 'leadId']
    },
    handler: 'orchestrator.callAgent',
    requiresApproval: false
  },
  {
    name: 'call_sms_agent',
    description: 'Call the SMS Agent to compose or send an SMS',
    parameters: {
      type: 'object',
      properties: {
        action: { enum: ['compose', 'send', 'reply', 'track'] },
        leadId: { type: 'string' },
        params: { type: 'object' }
      },
      required: ['action', 'leadId']
    },
    handler: 'orchestrator.callAgent',
    requiresApproval: false
  },
  {
    name: 'call_research_agent',
    description: 'Call the Research Agent to gather data on a lead/company',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        researchType: { enum: ['company', 'contact', 'intent', 'full'] }
      },
      required: ['leadId', 'researchType']
    },
    handler: 'orchestrator.callAgent',
    requiresApproval: false
  },
  {
    name: 'call_campaign_agent',
    description: 'Call the Campaign Agent to create or modify campaigns',
    parameters: {
      type: 'object',
      properties: {
        action: { enum: ['create', 'update', 'add_leads', 'get_status'] },
        campaignId: { type: 'string', optional: true },
        params: { type: 'object' }
      },
      required: ['action']
    },
    handler: 'orchestrator.callAgent',
    requiresApproval: true  // Campaign changes need approval
  }
]
```

---

## Execution Flow

### Example: "Run a 3-touch email sequence for my new leads"

```
User: "Run a 3-touch email sequence for the 50 new leads in Campaign X"

Orchestrator:
1. Parse request → 3-touch email, Campaign X, 50 leads
2. Check guardrails → 50 emails OK (under daily limit)
3. Call Campaign Agent → Get/create sequence
4. For each lead:
   a. Call Research Agent → Get company/contact data
   b. Call Qualify Agent → Score lead
   c. If qualified:
      - Call Email Agent → Compose email 1
      - Queue for approval
5. After approval:
   - Call Email Agent → Send emails
   - Schedule follow-ups (Day 3, Day 7)
6. Report status via Slack
```

### Sequence Diagram

```
┌──────┐  ┌───────────┐  ┌───────┐  ┌─────────┐  ┌───────┐  ┌───────┐
│ User │  │Orchestrator│  │Research│  │ Qualify │  │ Email │  │ Slack │
└──┬───┘  └─────┬─────┘  └───┬───┘  └────┬────┘  └───┬───┘  └───┬───┘
   │            │            │           │           │           │
   │  Request   │            │           │           │           │
   │───────────▶│            │           │           │           │
   │            │            │           │           │           │
   │            │  Research  │           │           │           │
   │            │───────────▶│           │           │           │
   │            │◀───────────│           │           │           │
   │            │            │           │           │           │
   │            │  Qualify   │           │           │           │
   │            │────────────────────────▶│           │           │
   │            │◀────────────────────────│           │           │
   │            │            │           │           │           │
   │            │  Compose   │           │           │           │
   │            │─────────────────────────────────────▶│           │
   │            │◀─────────────────────────────────────│           │
   │            │            │           │           │           │
   │            │  Request Approval      │           │           │
   │            │───────────────────────────────────────────────▶│
   │            │            │           │           │           │
   │            │◀──────────────────────── Approved ─────────────│
   │            │            │           │           │           │
   │            │  Send      │           │           │           │
   │            │─────────────────────────────────────▶│           │
   │            │◀─────────────────────────────────────│           │
   │            │            │           │           │           │
   │  Done      │            │           │           │           │
   │◀───────────│            │           │           │           │
```

---

## Database Schema (Simplified)

```sql
-- Agent definitions (configured via dashboard)
CREATE TABLE agent_definition (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,

  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,

  system_prompt TEXT NOT NULL,
  tools JSONB NOT NULL DEFAULT '[]',
  guardrails JSONB NOT NULL DEFAULT '{}',

  model VARCHAR(50) NOT NULL DEFAULT 'claude-sonnet',
  max_tokens INT NOT NULL DEFAULT 2048,
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.5,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  FOREIGN KEY (organization_id) REFERENCES organization(id)
);

-- Agent executions (audit trail)
CREATE TABLE agent_execution (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,

  -- What triggered this
  trigger_type VARCHAR(50) NOT NULL,  -- 'user', 'orchestrator', 'schedule', 'webhook'
  trigger_context JSONB,
  parent_execution_id VARCHAR(36),    -- If called by orchestrator

  -- Input/Output
  input_prompt TEXT NOT NULL,
  input_context JSONB,
  output_response TEXT,
  output_tool_calls JSONB,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  error TEXT,

  -- Metrics
  tokens_input INT,
  tokens_output INT,
  duration_ms INT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organization(id),
  FOREIGN KEY (agent_id) REFERENCES agent_definition(id),
  FOREIGN KEY (parent_execution_id) REFERENCES agent_execution(id)
);

CREATE INDEX agent_execution_parent_idx ON agent_execution(parent_execution_id);
CREATE INDEX agent_execution_status_idx ON agent_execution(status);

-- Pending approvals
CREATE TABLE agent_approval (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  execution_id VARCHAR(36) NOT NULL,

  approval_type VARCHAR(50) NOT NULL,  -- 'send_email', 'send_sms', 'create_campaign'

  -- What needs approval
  action_summary TEXT NOT NULL,
  action_details JSONB NOT NULL,

  -- Related entities
  lead_id VARCHAR(36),
  campaign_id VARCHAR(36),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_by VARCHAR(36),
  response VARCHAR(20),  -- 'approved', 'rejected', 'modified'
  response_note TEXT,
  modifications JSONB,

  -- Routing
  slack_message_ts VARCHAR(50),
  slack_channel_id VARCHAR(50),

  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organization(id),
  FOREIGN KEY (execution_id) REFERENCES agent_execution(id)
);

CREATE INDEX agent_approval_pending_idx ON agent_approval(organization_id, status)
  WHERE status = 'pending';
```

---

## API Design

### Invoke Orchestrator

```typescript
// POST /api/agents/orchestrator/invoke
interface InvokeOrchestratorRequest {
  prompt: string                    // Natural language request
  context?: {
    campaignId?: string
    leadIds?: string[]
    listId?: string
  }
  options?: {
    dryRun?: boolean               // Show plan without executing
    requireApprovalForAll?: boolean // Override auto-approve
  }
}

interface InvokeOrchestratorResponse {
  executionId: string
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed'
  plan: {
    steps: PlannedStep[]
    estimatedCost: number
    estimatedTime: string
  }
  pendingApprovals?: ApprovalRequest[]
  results?: ExecutionResult[]
}
```

### Agent Management

```typescript
// GET /api/agents/definitions
// List all agent definitions for org

// POST /api/agents/definitions
// Create new agent definition
interface CreateAgentDefinitionRequest {
  name: string
  type: AgentType
  description: string
  systemPrompt: string
  tools: string[]
  guardrails: GuardrailConfig
  model?: string
}

// PATCH /api/agents/definitions/:id
// Update system prompt, guardrails, etc.

// POST /api/agents/definitions/:id/test
// Test agent with sample input
interface TestAgentRequest {
  prompt: string
  context?: Record<string, unknown>
  dryRun?: boolean
}
```

### Approvals

```typescript
// GET /api/agents/approvals
// List pending approvals

// POST /api/agents/approvals/:id/respond
interface ApprovalResponse {
  action: 'approve' | 'reject' | 'modify'
  note?: string
  modifications?: Record<string, unknown>
}

// POST /api/agents/approvals/batch
// Batch approve/reject
```

---

## Implementation Plan

### Phase 1: Core Agent Framework (Week 1)

1. **Agent Definition Schema**
   - Database migration for agent_definition, agent_execution, agent_approval
   - Repository and service layers
   - API endpoints for CRUD

2. **Claude Integration**
   - Wrapper service for Claude API calls
   - Tool execution framework
   - Token tracking and rate limiting

3. **Basic Agents**
   - Email Agent (compose only, use existing send)
   - SMS Agent (compose only, use existing send)
   - Research Agent (web search integration)

### Phase 2: Orchestrator (Week 2)

1. **Orchestrator Agent**
   - Tool definitions for calling other agents
   - Execution context management
   - Multi-step planning

2. **Approval Flow**
   - Slack integration for approvals
   - Dashboard approval UI
   - Batch operations

3. **Guardrails**
   - Rate limiting per agent
   - Daily quotas
   - Compliance checks

### Phase 3: Campaign Automation (Week 3)

1. **Campaign Agent**
   - Create campaigns from prompts
   - Sequence generation
   - Follow-up scheduling

2. **Analytics Agent**
   - Report generation
   - Dashboard updates
   - Slack summaries

3. **Qualify Agent**
   - ICP scoring
   - Lead categorization
   - Action recommendations

### Phase 4: Self-Service & Iteration (Week 4)

1. **Prompt Editor UI**
   - Edit system prompts in dashboard
   - Test agents with sample data
   - Version history

2. **Template Library**
   - Pre-built agent configurations
   - Campaign templates
   - Best practice guardrails

3. **Monitoring**
   - Execution dashboard
   - Cost tracking
   - Error alerting

---

## Example Usage

### Via Dashboard/API

```typescript
// Create a campaign via orchestrator
const response = await fetch('/api/agents/orchestrator/invoke', {
  method: 'POST',
  body: JSON.stringify({
    prompt: `Create a 3-touch cold email sequence for Series A+
             fintech companies. Research each company first,
             personalize based on recent news. Schedule emails
             for Tuesday-Thursday mornings.`,
    context: {
      listId: 'list-fintech-2024'
    }
  })
})

// Orchestrator will:
// 1. Call Campaign Agent to create sequence
// 2. For each lead, call Research Agent
// 3. Call Qualify Agent to score
// 4. Call Email Agent to compose personalized emails
// 5. Request approval via Slack
// 6. Send on approval
```

### Via Slack

```
User: @GTMBot run outreach for the new hubspot leads

GTMBot: I'll process the 23 new leads from HubSpot:
- Research each company
- Score against your ICP
- Compose personalized emails

This will use ~2,500 tokens (~$0.05). Proceed?

User: yes

GTMBot: Processing...
✅ 18 qualified leads
⏸️ 5 need review (low confidence)

[Approve All Qualified] [Review Low Confidence] [Cancel]
```

---

## Cost Estimates

| Agent | Tokens/Call | Cost/Call | Typical Volume |
|-------|-------------|-----------|----------------|
| Orchestrator | ~2,000 | $0.006 | 10-50/day |
| Email | ~800 | $0.0008 | 50-200/day |
| SMS | ~300 | $0.0003 | 20-100/day |
| Research | ~3,000 | $0.009 | 50-200/day |
| Qualify | ~500 | $0.0005 | 100-500/day |
| Analytics | ~1,500 | $0.0015 | 5-20/day |
| Campaign | ~1,200 | $0.004 | 1-5/day |

**Estimated daily cost**: $5-20 for moderate usage (100 leads/day)

---

## Guardrail Examples

### Organization-Level (in Orchestrator prompt)
```
Guardrails:
- Max 200 emails per day
- Max 50 SMS per day
- No emails before 8am or after 6pm recipient time
- All emails must include unsubscribe link
- No contact to: @gmail.com, @yahoo.com (B2B only)
- Require approval for: campaigns, bulk sends (>10)
- Auto-approve: single sends, research, qualification
```

### Agent-Level (in agent definition)
```typescript
guardrails: {
  maxActionsPerHour: 100,
  requiresApproval: true,
  allowedOperations: ['compose', 'send'],
  blockedOperations: ['bulk_send', 'delete'],
  complianceChecks: ['has_unsubscribe', 'no_personal_domains']
}
```

---

## Next Steps

1. Review this spec - does it match your vision?
2. Prioritize which agents to build first
3. Define the exact tool interfaces
4. Set up Claude API integration
5. Build the orchestrator framework
