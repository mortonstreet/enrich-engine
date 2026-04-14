# Multi-Agent Lead Orchestration Technical Specification

## Executive Summary

This specification outlines a multi-agent orchestration system for lead processing, qualification, and outreach. The design synthesizes patterns from:
- **Vercel Lead Agent**: Human-in-the-loop qualification workflows
- **Gas Town (Steve Yegge)**: Parallel agent execution with persistent state
- **Drew Bredvick / GTM Engineering**: AI-first go-to-market operations
- **Anthropic Agent Patterns**: Production-grade agent architectures

The system enables autonomous lead processing at scale while maintaining human oversight for critical decisions.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Agent Taxonomy](#2-agent-taxonomy)
3. [State Management (Beads Pattern)](#3-state-management-beads-pattern)
4. [Workflow Orchestration](#4-workflow-orchestration)
5. [Communication Protocols](#5-communication-protocols)
6. [Human-in-the-Loop Integration](#6-human-in-the-loop-integration)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Implementation Phases](#9-implementation-phases)
10. [Cost & Performance Considerations](#10-cost--performance-considerations)

---

## 1. Architecture Overview

### 1.1 Design Principles

Based on Anthropic's guidance:
- **Simplicity First**: Start with simple patterns, add complexity only when needed
- **Transparency**: Expose agent reasoning and decision steps
- **Error Recovery**: Design for graceful failure and human escalation
- **External State**: Persist work state outside agent context (Gas Town pattern)

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   Mayor     │    │   Witness   │    │   Deacon    │            │
│  │ (Conductor) │    │  (Monitor)  │    │  (Scheduler)│            │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│         │                  │                  │                    │
├─────────┼──────────────────┼──────────────────┼────────────────────┤
│         │                  │                  │                    │
│         ▼                  ▼                  ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    AGENT POOL (Polecats)                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │
│  │  │ Research │ │ Qualify  │ │ Compose  │ │ Enrich   │        │  │
│  │  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │        │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         STATE LAYER (Beads)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │   Work Queue   │  │ Agent Mailbox  │  │  Audit Trail   │       │
│  │    (Convoys)   │  │    (Hooks)     │  │    (Beads)     │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                      INTEGRATION LAYER                              │
│  ┌──────┐ ┌───────┐ ┌────────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ │
│  │Slack │ │ Email │ │Twilio  │ │ CRM  │ │Enrichment│ │ Research │ │
│  └──────┘ └───────┘ └────────┘ └──────┘ └─────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Comparison: Sequential vs Parallel

| Aspect | Sequential (Current) | Parallel (Target) |
|--------|---------------------|-------------------|
| Processing | One lead at a time | 10-30 concurrent agents |
| Latency | Minutes per lead | Seconds per lead |
| State | In-memory | Persistent (Beads) |
| Failure | Full retry | Checkpoint resume |
| Scaling | Vertical | Horizontal |

---

## 2. Agent Taxonomy

### 2.1 Orchestration Agents (Persistent)

#### Mayor (Conductor)
**Role**: Primary orchestrator coordinating all agent activity
**Responsibilities**:
- Receives work requests (leads, campaigns, bulk operations)
- Creates convoys (work bundles) from lead batches
- Assigns work to available agents
- Tracks progress and handles failures
- Reports status to humans via Slack

```typescript
interface MayorContext {
  activeConvoys: Convoy[]
  agentPool: AgentStatus[]
  workQueue: WorkItem[]
  escalationRules: EscalationRule[]
}

interface MayorAction {
  type: 'CREATE_CONVOY' | 'ASSIGN_WORK' | 'ESCALATE' | 'REPORT_STATUS'
  payload: unknown
}
```

#### Witness (Monitor)
**Role**: Health monitoring and stuck agent detection
**Responsibilities**:
- Monitors agent heartbeats
- Detects stalled work items
- Triggers recovery or escalation
- Logs anomalies for debugging

#### Deacon (Scheduler)
**Role**: Time-based workflow orchestration
**Responsibilities**:
- Manages scheduled campaigns
- Triggers follow-up sequences
- Handles rate limiting across agents
- Enforces daily/hourly quotas

### 2.2 Worker Agents (Ephemeral Polecats)

#### Research Agent
**Specialization**: Deep lead and company research
**Tools**:
- Web search (Exa, Perplexity, Firecrawl)
- LinkedIn data extraction
- Company database queries
- News/press release scanning

**Output Schema**:
```typescript
interface ResearchOutput {
  leadId: string
  companyInfo: {
    size: string
    industry: string
    funding: string | null
    techStack: string[]
    recentNews: NewsItem[]
  }
  contactInfo: {
    role: string
    tenure: string
    linkedin: string | null
    mutualConnections: number
  }
  intentSignals: IntentSignal[]
  confidence: number
}
```

#### Qualification Agent
**Specialization**: Lead scoring and categorization
**Tools**:
- ICP matching rules
- Scoring model invocation
- Historical conversion analysis

**Output Schema**:
```typescript
interface QualificationOutput {
  leadId: string
  category: 'HIGH_INTENT' | 'QUALIFIED' | 'NURTURE' | 'DISQUALIFIED'
  score: number // 0-100
  reasoning: string
  matchedCriteria: string[]
  missingCriteria: string[]
  recommendedAction: 'OUTREACH' | 'FOLLOW_UP' | 'ARCHIVE' | 'ESCALATE'
}
```

#### Compose Agent
**Specialization**: Personalized outreach content generation
**Tools**:
- Email template retrieval
- Personalization engine
- A/B variant generation
- Compliance checker

**Output Schema**:
```typescript
interface ComposeOutput {
  leadId: string
  emailDraft: {
    subject: string
    body: string
    personalizationTokens: Record<string, string>
  }
  smsDraft?: string
  linkedInDraft?: string
  variantId: string
  complianceFlags: string[]
}
```

#### Enrich Agent
**Specialization**: Contact data enrichment
**Tools**:
- Apollo/ZoomInfo API
- Clearbit
- LinkedIn Sales Navigator
- Email verification

**Output Schema**:
```typescript
interface EnrichOutput {
  leadId: string
  enrichedFields: Record<string, string | null>
  verificationStatus: {
    email: 'valid' | 'invalid' | 'unknown'
    phone: 'valid' | 'invalid' | 'unknown'
  }
  dataSource: string
  confidence: number
}
```

### 2.3 Agent Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  SPAWN   │───▶│  PRIME   │───▶│  EXECUTE │───▶│ COMPLETE │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     │               │               ▼               │
     │               │         ┌──────────┐         │
     │               │         │  STALLED │         │
     │               │         └──────────┘         │
     │               │               │               │
     ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    BEADS (State Store)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. State Management (Beads Pattern)

### 3.1 Core Concept

From Gas Town: "AI agents are ephemeral. But work context should be permanent."

Beads provide a persistent, append-only ledger of work items that survive agent restarts, failures, and scaling events.

### 3.2 Bead Structure

```typescript
interface Bead {
  id: string              // Format: "gt-{5-char-alphanumeric}"
  type: BeadType
  status: BeadStatus
  agentId: string | null  // Assigned agent
  convoyId: string | null // Parent convoy
  leadId: string

  // Work payload
  input: Record<string, unknown>
  output: Record<string, unknown> | null

  // Tracking
  createdAt: Date
  assignedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null

  // Error handling
  attempts: number
  lastError: string | null

  // Lineage
  parentBeadId: string | null
  childBeadIds: string[]
}

type BeadType =
  | 'RESEARCH'
  | 'QUALIFY'
  | 'COMPOSE'
  | 'ENRICH'
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'AWAIT_APPROVAL'
  | 'FOLLOW_UP'

type BeadStatus =
  | 'PENDING'      // Awaiting assignment
  | 'ASSIGNED'     // Agent claimed it
  | 'IN_PROGRESS'  // Agent working
  | 'COMPLETED'    // Success
  | 'FAILED'       // Error, may retry
  | 'BLOCKED'      // Awaiting dependency
  | 'APPROVED'     // Human approved
  | 'REJECTED'     // Human rejected
```

### 3.3 Convoys (Work Bundles)

Convoys group related beads for coordinated processing:

```typescript
interface Convoy {
  id: string
  name: string
  type: ConvoyType
  status: ConvoyStatus

  // Scope
  organizationId: string
  campaignId: string | null

  // Composition
  beadIds: string[]
  totalBeads: number
  completedBeads: number
  failedBeads: number

  // Configuration
  parallelism: number      // Max concurrent agents
  retryPolicy: RetryPolicy
  timeoutMinutes: number

  // Tracking
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null

  // Triggers
  onComplete: ConvoyAction | null
  onFailure: ConvoyAction | null
}

type ConvoyType =
  | 'LEAD_INTAKE'      // New leads processing
  | 'BULK_QUALIFY'     // Batch qualification
  | 'CAMPAIGN_LAUNCH'  // Campaign execution
  | 'FOLLOW_UP'        // Scheduled follow-ups
  | 'RE_ENGAGE'        // Cold lead re-engagement
```

### 3.4 Mailbox System (Hooks)

Asynchronous communication between orchestrator and agents:

```typescript
interface AgentMailbox {
  agentId: string
  messages: MailboxMessage[]
}

interface MailboxMessage {
  id: string
  type: 'ASSIGNMENT' | 'CANCELLATION' | 'PRIORITY_CHANGE' | 'CONTEXT_UPDATE'
  beadId: string
  payload: unknown
  createdAt: Date
  readAt: Date | null
}
```

---

## 4. Workflow Orchestration

### 4.1 Workflow Patterns (Anthropic-aligned)

#### Pattern 1: Prompt Chaining
Sequential handoffs with validation gates.

```typescript
// Lead Intake Workflow
const leadIntakeWorkflow = {
  steps: [
    { agent: 'enrich', gate: 'hasValidEmail' },
    { agent: 'research', gate: 'hasCompanyData' },
    { agent: 'qualify', gate: 'scoreAboveThreshold' },
    { agent: 'compose', gate: 'passesCompliance' },
    { type: 'approval', channel: 'slack' },
    { agent: 'send', condition: 'approved' }
  ]
}
```

#### Pattern 2: Parallelization (Sectioning)
Independent tasks run simultaneously:

```typescript
// Bulk Qualification Workflow
const bulkQualifyWorkflow = {
  parallelism: 10,
  steps: [
    {
      parallel: true,
      agents: ['research', 'enrich'], // Run together per lead
    },
    { agent: 'qualify' },             // After both complete
    { agent: 'compose' }
  ]
}
```

#### Pattern 3: Orchestrator-Workers
Mayor dynamically delegates based on lead characteristics:

```typescript
// Dynamic Routing
const dynamicWorkflow = {
  orchestrator: 'mayor',
  routing: {
    'high_value': ['deep_research', 'executive_compose'],
    'standard': ['quick_research', 'template_compose'],
    'nurture': ['minimal_enrich', 'newsletter_add']
  }
}
```

#### Pattern 4: Evaluator-Optimizer
Iterative refinement for high-stakes outreach:

```typescript
// Executive Outreach Workflow
const executiveOutreach = {
  compose: { agent: 'compose', model: 'claude-sonnet' },
  evaluate: { agent: 'evaluate', model: 'claude-opus', iterations: 3 },
  approval: { channel: 'slack', requiredApprovers: 2 }
}
```

### 4.2 Workflow Definition Schema

```typescript
interface WorkflowDefinition {
  id: string
  name: string
  version: number

  // Trigger conditions
  trigger: {
    type: 'MANUAL' | 'EVENT' | 'SCHEDULE' | 'WEBHOOK'
    config: Record<string, unknown>
  }

  // Step definitions
  steps: WorkflowStep[]

  // Global settings
  settings: {
    parallelism: number
    timeout: number
    retryPolicy: RetryPolicy
    humanApprovalRequired: boolean
  }
}

interface WorkflowStep {
  id: string
  type: 'AGENT' | 'GATE' | 'PARALLEL' | 'APPROVAL' | 'WAIT' | 'BRANCH'

  // Agent step
  agent?: AgentType
  tools?: string[]

  // Gate step (validation)
  gate?: {
    condition: string  // JSONLogic expression
    onFail: 'STOP' | 'SKIP' | 'ESCALATE'
  }

  // Parallel step
  parallel?: {
    steps: WorkflowStep[]
    waitFor: 'ALL' | 'ANY' | 'MAJORITY'
  }

  // Approval step
  approval?: {
    channel: 'SLACK' | 'EMAIL' | 'DASHBOARD'
    timeout: number
    escalateTo: string | null
  }

  // Branching
  branch?: {
    condition: string
    trueBranch: WorkflowStep[]
    falseBranch: WorkflowStep[]
  }
}
```

### 4.3 Workflow Execution Engine

```typescript
class WorkflowEngine {
  async executeWorkflow(
    definition: WorkflowDefinition,
    convoy: Convoy
  ): Promise<WorkflowResult> {
    const execution = await this.createExecution(definition, convoy)

    for (const step of definition.steps) {
      const result = await this.executeStep(step, execution)

      if (result.status === 'BLOCKED') {
        await this.saveCheckpoint(execution, step)
        return { status: 'PAUSED', checkpoint: execution.id }
      }

      if (result.status === 'FAILED' && !step.continueOnError) {
        return this.handleFailure(execution, step, result.error)
      }
    }

    return { status: 'COMPLETED', execution }
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<StepResult> {
    switch (step.type) {
      case 'AGENT':
        return this.executeAgentStep(step, execution)
      case 'PARALLEL':
        return this.executeParallelStep(step, execution)
      case 'APPROVAL':
        return this.requestApproval(step, execution)
      case 'GATE':
        return this.evaluateGate(step, execution)
      case 'BRANCH':
        return this.evaluateBranch(step, execution)
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }
}
```

---

## 5. Communication Protocols

### 5.1 Agent-to-Orchestrator

Agents report status via structured messages:

```typescript
interface AgentReport {
  agentId: string
  beadId: string
  timestamp: Date
  type: 'HEARTBEAT' | 'PROGRESS' | 'COMPLETION' | 'ERROR' | 'ESCALATION'

  // Progress reporting
  progress?: {
    currentStep: string
    percentComplete: number
    tokensUsed: number
  }

  // Completion
  output?: Record<string, unknown>

  // Error
  error?: {
    code: string
    message: string
    recoverable: boolean
  }

  // Escalation
  escalation?: {
    reason: string
    suggestedAction: string
    context: Record<string, unknown>
  }
}
```

### 5.2 Orchestrator-to-Agent (Mailbox)

```typescript
interface AgentAssignment {
  beadId: string
  type: BeadType
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

  // Work context
  input: Record<string, unknown>
  tools: ToolConfig[]
  constraints: {
    maxTokens: number
    timeoutSeconds: number
    requiredOutputFields: string[]
  }

  // Handoff context from previous agents
  priorOutputs: Record<string, unknown>
}
```

### 5.3 Inter-Agent Handoff

When agents need to delegate or collaborate:

```typescript
interface AgentHandoff {
  fromAgentId: string
  toAgentType: AgentType
  beadId: string

  handoffType: 'DELEGATE' | 'COLLABORATE' | 'ESCALATE'

  context: {
    summary: string
    completedWork: string[]
    remainingWork: string[]
    constraints: string[]
  }

  artifacts: Record<string, unknown>
}
```

---

## 6. Human-in-the-Loop Integration

### 6.1 Approval Patterns

Based on Vercel Lead Agent and GTM Engineering patterns:

```typescript
interface ApprovalRequest {
  id: string
  beadId: string
  type: 'OUTREACH' | 'QUALIFICATION_OVERRIDE' | 'DATA_CORRECTION' | 'ESCALATION'

  // What needs approval
  subject: {
    leadId: string
    leadName: string
    company: string
  }

  // Proposed action
  proposal: {
    action: string
    content: Record<string, unknown>
    agentReasoning: string
  }

  // Options
  options: ApprovalOption[]

  // Routing
  routing: {
    channel: 'SLACK' | 'DASHBOARD' | 'EMAIL'
    assignees: string[]
    escalateAfterMinutes: number
    escalateTo: string
  }

  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'EXPIRED'
  response?: ApprovalResponse
}

interface ApprovalOption {
  id: string
  label: string
  action: 'APPROVE' | 'REJECT' | 'MODIFY' | 'ESCALATE'
  requiresComment: boolean
}

interface ApprovalResponse {
  option: string
  responderId: string
  comment: string | null
  modifications: Record<string, unknown> | null
  timestamp: Date
}
```

### 6.2 Slack Integration

Extending existing Slack service:

```typescript
// Approval message blocks
function buildApprovalBlocks(request: ApprovalRequest): SlackBlock[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${request.type} Approval Required` }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Lead:* ${request.subject.leadName}` },
        { type: 'mrkdwn', text: `*Company:* ${request.subject.company}` },
      ]
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Agent Reasoning:*\n${request.proposal.agentReasoning}` }
    },
    {
      type: 'divider'
    },
    // Content preview (email/SMS)
    ...buildContentPreview(request.proposal.content),
    {
      type: 'actions',
      elements: request.options.map(opt => ({
        type: 'button',
        text: { type: 'plain_text', text: opt.label },
        style: opt.action === 'APPROVE' ? 'primary' :
               opt.action === 'REJECT' ? 'danger' : undefined,
        action_id: `approval_${request.id}_${opt.id}`,
        value: JSON.stringify({ requestId: request.id, optionId: opt.id })
      }))
    }
  ]
}
```

### 6.3 Dashboard Integration

For bulk approvals and oversight:

```typescript
interface ApprovalDashboardState {
  pending: ApprovalRequest[]
  stats: {
    pendingCount: number
    approvedToday: number
    rejectedToday: number
    avgResponseTime: number
  }
  filters: {
    type: ApprovalType | null
    agent: string | null
    dateRange: DateRange
  }
}

// Batch operations
interface BatchApprovalAction {
  requestIds: string[]
  action: 'APPROVE_ALL' | 'REJECT_ALL'
  comment: string | null
}
```

---

## 7. Database Schema

### 7.1 New Tables

```sql
-- Beads: Work items
CREATE TABLE bead (
  id VARCHAR(10) PRIMARY KEY,  -- gt-xxxxx format
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

  organization_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36),
  convoy_id VARCHAR(36),
  lead_id VARCHAR(36) NOT NULL,

  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,

  parent_bead_id VARCHAR(10),

  FOREIGN KEY (organization_id) REFERENCES organization(id),
  FOREIGN KEY (lead_id) REFERENCES lead(id),
  FOREIGN KEY (convoy_id) REFERENCES convoy(id),
  FOREIGN KEY (parent_bead_id) REFERENCES bead(id)
);

CREATE INDEX bead_status_idx ON bead(status);
CREATE INDEX bead_convoy_idx ON bead(convoy_id);
CREATE INDEX bead_lead_idx ON bead(lead_id);
CREATE INDEX bead_agent_idx ON bead(agent_id);

-- Convoys: Work bundles
CREATE TABLE convoy (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

  organization_id VARCHAR(36) NOT NULL,
  campaign_id VARCHAR(36),
  workflow_id VARCHAR(36),

  total_beads INT NOT NULL DEFAULT 0,
  completed_beads INT NOT NULL DEFAULT 0,
  failed_beads INT NOT NULL DEFAULT 0,

  parallelism INT NOT NULL DEFAULT 5,
  timeout_minutes INT NOT NULL DEFAULT 60,
  retry_policy JSONB NOT NULL DEFAULT '{"maxAttempts": 3, "backoffMs": 5000}',

  on_complete JSONB,
  on_failure JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organization(id),
  FOREIGN KEY (campaign_id) REFERENCES campaign(id),
  FOREIGN KEY (workflow_id) REFERENCES agent_workflow(id)
);

CREATE INDEX convoy_status_idx ON convoy(status);
CREATE INDEX convoy_org_idx ON convoy(organization_id);

-- Agent instances
CREATE TABLE agent_instance (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,  -- References agent (SDR agent config)
  type VARCHAR(50) NOT NULL,      -- research, qualify, compose, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'IDLE',

  current_bead_id VARCHAR(10),

  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMP NOT NULL DEFAULT NOW(),

  tokens_used INT NOT NULL DEFAULT 0,
  beads_completed INT NOT NULL DEFAULT 0,

  FOREIGN KEY (agent_id) REFERENCES agent(id),
  FOREIGN KEY (current_bead_id) REFERENCES bead(id)
);

CREATE INDEX agent_instance_status_idx ON agent_instance(status);
CREATE INDEX agent_instance_heartbeat_idx ON agent_instance(last_heartbeat);

-- Agent mailbox
CREATE TABLE agent_mailbox (
  id VARCHAR(36) PRIMARY KEY,
  agent_instance_id VARCHAR(36) NOT NULL,

  message_type VARCHAR(50) NOT NULL,
  bead_id VARCHAR(10),
  payload JSONB NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP,

  FOREIGN KEY (agent_instance_id) REFERENCES agent_instance(id),
  FOREIGN KEY (bead_id) REFERENCES bead(id)
);

CREATE INDEX agent_mailbox_unread_idx ON agent_mailbox(agent_instance_id)
  WHERE read_at IS NULL;

-- Workflow definitions
CREATE TABLE workflow_definition (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,

  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',

  steps JSONB NOT NULL,  -- Array of WorkflowStep
  settings JSONB NOT NULL DEFAULT '{}',

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  FOREIGN KEY (organization_id) REFERENCES organization(id)
);

-- Workflow executions
CREATE TABLE workflow_execution (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL,
  convoy_id VARCHAR(36) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  current_step_index INT NOT NULL DEFAULT 0,

  context JSONB NOT NULL DEFAULT '{}',
  checkpoint JSONB,

  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,

  error TEXT,

  FOREIGN KEY (workflow_id) REFERENCES workflow_definition(id),
  FOREIGN KEY (convoy_id) REFERENCES convoy(id)
);

-- Approval requests
CREATE TABLE approval_request (
  id VARCHAR(36) PRIMARY KEY,
  bead_id VARCHAR(10) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,

  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

  subject JSONB NOT NULL,
  proposal JSONB NOT NULL,
  options JSONB NOT NULL,
  routing JSONB NOT NULL,

  response JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP,

  FOREIGN KEY (bead_id) REFERENCES bead(id),
  FOREIGN KEY (organization_id) REFERENCES organization(id)
);

CREATE INDEX approval_request_pending_idx ON approval_request(organization_id, status)
  WHERE status = 'PENDING';
```

### 7.2 Schema Updates to Existing Tables

```sql
-- Add orchestration fields to agent table
ALTER TABLE agent ADD COLUMN orchestration_enabled BOOLEAN DEFAULT false;
ALTER TABLE agent ADD COLUMN max_parallel_agents INT DEFAULT 5;
ALTER TABLE agent ADD COLUMN default_workflow_id VARCHAR(36);
ALTER TABLE agent ADD FOREIGN KEY (default_workflow_id)
  REFERENCES workflow_definition(id);

-- Add bead reference to agent_message
ALTER TABLE agent_message ADD COLUMN bead_id VARCHAR(10);
ALTER TABLE agent_message ADD FOREIGN KEY (bead_id) REFERENCES bead(id);

-- Add convoy reference to lead_qualification
ALTER TABLE lead_qualification ADD COLUMN convoy_id VARCHAR(36);
ALTER TABLE lead_qualification ADD COLUMN bead_id VARCHAR(10);
ALTER TABLE lead_qualification ADD FOREIGN KEY (convoy_id) REFERENCES convoy(id);
ALTER TABLE lead_qualification ADD FOREIGN KEY (bead_id) REFERENCES bead(id);
```

---

## 8. API Design

### 8.1 Orchestration Endpoints

```typescript
// POST /api/agents/:agentId/orchestration/convoys
// Create a new convoy (work bundle)
interface CreateConvoyRequest {
  name: string
  type: ConvoyType
  leadIds?: string[]
  campaignId?: string
  listId?: string
  workflowId?: string
  parallelism?: number
  settings?: {
    skipEnrichment?: boolean
    skipResearch?: boolean
    autoApprove?: boolean
  }
}

// GET /api/agents/:agentId/orchestration/convoys
// List convoys with filtering
interface ListConvoysQuery {
  status?: ConvoyStatus
  type?: ConvoyType
  limit?: number
  offset?: number
}

// GET /api/agents/:agentId/orchestration/convoys/:convoyId
// Get convoy details with bead status breakdown

// POST /api/agents/:agentId/orchestration/convoys/:convoyId/start
// Start processing a convoy

// POST /api/agents/:agentId/orchestration/convoys/:convoyId/pause
// Pause convoy processing

// POST /api/agents/:agentId/orchestration/convoys/:convoyId/cancel
// Cancel convoy and cleanup

// GET /api/agents/:agentId/orchestration/beads
// List beads with filtering
interface ListBeadsQuery {
  convoyId?: string
  leadId?: string
  status?: BeadStatus
  type?: BeadType
}

// GET /api/agents/:agentId/orchestration/beads/:beadId
// Get bead details including input/output

// POST /api/agents/:agentId/orchestration/beads/:beadId/retry
// Retry a failed bead

// GET /api/agents/:agentId/orchestration/instances
// List active agent instances

// GET /api/agents/:agentId/orchestration/stats
// Get orchestration statistics
interface OrchestrationStats {
  activeConvoys: number
  activeAgents: number
  beadsProcessedToday: number
  beadsFailedToday: number
  avgProcessingTime: number
  tokenUsageToday: number
  approvalsPending: number
}
```

### 8.2 Workflow Endpoints

```typescript
// POST /api/agents/:agentId/workflows
// Create workflow definition

// GET /api/agents/:agentId/workflows
// List workflow definitions

// GET /api/agents/:agentId/workflows/:workflowId
// Get workflow details

// PUT /api/agents/:agentId/workflows/:workflowId
// Update workflow (creates new version)

// POST /api/agents/:agentId/workflows/:workflowId/execute
// Execute workflow manually
interface ExecuteWorkflowRequest {
  leadIds?: string[]
  campaignId?: string
  listId?: string
  dryRun?: boolean
}

// GET /api/agents/:agentId/workflows/:workflowId/executions
// List workflow executions

// GET /api/agents/:agentId/workflows/:workflowId/executions/:executionId
// Get execution details
```

### 8.3 Approval Endpoints

```typescript
// GET /api/agents/approvals
// List pending approvals for organization

// GET /api/agents/approvals/:approvalId
// Get approval details

// POST /api/agents/approvals/:approvalId/respond
interface ApprovalResponseRequest {
  optionId: string
  comment?: string
  modifications?: Record<string, unknown>
}

// POST /api/agents/approvals/batch
// Batch approve/reject
interface BatchApprovalRequest {
  approvalIds: string[]
  action: 'APPROVE' | 'REJECT'
  comment?: string
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Core infrastructure without parallelization

1. Database migrations for beads, convoys, workflow tables
2. Bead repository with CRUD operations
3. Convoy service with sequential execution
4. Basic workflow engine (chaining pattern only)
5. Integration with existing agent service

**Deliverables**:
- Single-threaded convoy processing
- Checkpoint/resume capability
- Basic Slack approval integration

### Phase 2: Parallel Execution (Week 3-4)
**Goal**: Multi-agent parallel processing

1. Agent instance management (spawn/terminate)
2. Mailbox system for async communication
3. Witness agent for health monitoring
4. Parallelization in workflow engine
5. Rate limiting and quota management

**Deliverables**:
- 5-10 concurrent agents per convoy
- Automatic failure recovery
- Real-time progress tracking

### Phase 3: Advanced Workflows (Week 5-6)
**Goal**: Complex orchestration patterns

1. Orchestrator-workers pattern (Mayor)
2. Evaluator-optimizer pattern for content refinement
3. Dynamic routing based on lead characteristics
4. Workflow versioning and A/B testing
5. Custom tool integration framework

**Deliverables**:
- Workflow designer UI
- Template library (intake, outreach, follow-up)
- Performance analytics

### Phase 4: Scale & Optimize (Week 7-8)
**Goal**: Production hardening

1. Horizontal scaling (10-30 agents)
2. Cost optimization (model routing)
3. Enhanced monitoring and alerting
4. Audit trail and compliance
5. API documentation and SDK

**Deliverables**:
- Production deployment guide
- Cost dashboard
- SLA monitoring

---

## 10. Cost & Performance Considerations

### 10.1 Token Economics

Based on Gas Town benchmarks ("$100/hour token burn rate at peak"):

| Agent Type | Avg Tokens/Lead | Estimated Cost |
|------------|-----------------|----------------|
| Research | 8,000-15,000 | $0.10-0.20 |
| Qualify | 2,000-4,000 | $0.02-0.05 |
| Compose | 3,000-6,000 | $0.04-0.08 |
| Enrich | 500-1,000 | $0.01-0.02 |
| **Total** | 13,500-26,000 | **$0.17-0.35** |

### 10.2 Model Routing Strategy

```typescript
interface ModelRoutingConfig {
  research: {
    default: 'claude-sonnet',
    deepResearch: 'claude-opus'
  },
  qualify: {
    default: 'claude-haiku',
    complex: 'claude-sonnet'
  },
  compose: {
    standard: 'claude-sonnet',
    executive: 'claude-opus',
    template: 'claude-haiku'
  }
}
```

### 10.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead processing latency | < 30s | p95 end-to-end |
| Convoy throughput | 100 leads/min | At 10 agents |
| Agent utilization | > 80% | Active time / total time |
| Failure rate | < 2% | Beads failed / total |
| Approval response time | < 5 min | p50 |

### 10.4 Scaling Considerations

```
Leads/Hour = Agents × (3600 / AvgProcessingSeconds) × Utilization

Example:
- 10 agents
- 30s average processing
- 80% utilization
= 10 × 120 × 0.8 = 960 leads/hour
```

---

## References

- [Vercel Lead Agent](https://github.com/vercel-labs/lead-agent) - Reference implementation
- [Gas Town](https://github.com/steveyegge/gastown) - Multi-agent workspace manager
- [What We Learned Building Agents at Vercel](https://vercel.com/blog/what-we-learned-building-agents-at-vercel)
- [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- [Drew Bredvick - GTM Engineering](https://drew.tech/posts/gtm-eng-why-now)
- [Two Kinds of Multi-Agent](https://paddo.dev/blog/gastown-two-kinds-of-multi-agent)

---

## Appendix A: Bead ID Generation

```typescript
function generateBeadId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'gt-'
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}
```

## Appendix B: Workflow Templates

### Lead Intake Template
```json
{
  "name": "Standard Lead Intake",
  "trigger": { "type": "EVENT", "config": { "event": "lead.created" } },
  "steps": [
    { "type": "AGENT", "agent": "enrich" },
    { "type": "GATE", "gate": { "condition": "output.verificationStatus.email == 'valid'" } },
    { "type": "PARALLEL", "parallel": { "steps": [
      { "type": "AGENT", "agent": "research" },
      { "type": "AGENT", "agent": "qualify" }
    ], "waitFor": "ALL" }},
    { "type": "BRANCH", "branch": {
      "condition": "qualify.output.category == 'HIGH_INTENT'",
      "trueBranch": [
        { "type": "AGENT", "agent": "compose", "config": { "template": "executive" } },
        { "type": "APPROVAL", "approval": { "channel": "SLACK" } }
      ],
      "falseBranch": [
        { "type": "AGENT", "agent": "compose", "config": { "template": "standard" } }
      ]
    }}
  ]
}
```

## Appendix C: Migration Path from Current System

1. **Phase 1**: New convoys wrap existing orchestration jobs
2. **Phase 2**: Beads replace orchestration job steps
3. **Phase 3**: Parallel execution enabled for qualifying orgs
4. **Phase 4**: Full migration, deprecate old system
