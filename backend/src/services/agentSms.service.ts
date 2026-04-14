/**
 * Agent SMS Service
 * Manages SMS configuration, A2P registration, and sending for AI SDR agents
 */

import crypto from 'crypto'
import { encrypt, decrypt } from '@/lib/encryption'
import * as agentRepo from '@/repositories/agent.repository'
import * as agentSmsConfigRepo from '@/repositories/agentSmsConfig.repository'
import * as agentMessageRepo from '@/repositories/agentMessage.repository'
import * as outreachService from './outreachGeneration.service'
import type {
  ProvisionAgentSmsRequest,
  ConfigureAgentSmsAiRequest,
  AgentSmsConfigResponse,
  AgentMessageResponse,
} from '@shared/types/src/requests/leadAgent'
import { db } from '@/lib/db'

// Twilio master account credentials (used to create subaccounts)
const TWILIO_MASTER_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_MASTER_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

/**
 * Provision a Twilio subaccount and phone number for an agent
 */
export async function provisionSms(
  agentId: string,
  organizationId: string,
  request: ProvisionAgentSmsRequest,
): Promise<AgentSmsConfigResponse> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  // Check if already configured
  const existing = await agentSmsConfigRepo.findByAgentId(agentId)
  if (existing?.twilioSubaccountSid) {
    throw new Error('SMS already provisioned for this agent')
  }

  if (!TWILIO_MASTER_ACCOUNT_SID || !TWILIO_MASTER_AUTH_TOKEN) {
    throw new Error(
      'Twilio master credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
    )
  }

  try {
    // Step 1: Create Twilio subaccount
    const subaccount = await createTwilioSubaccount(agent.name, organizationId)

    // Step 2: Purchase a phone number
    const phoneNumber = await purchasePhoneNumber(
      subaccount.sid,
      subaccount.authToken,
      request.areaCode || '415', // Default to Bay Area
      request.country,
    )

    // Step 3: Save configuration
    const config = await agentSmsConfigRepo.upsertByAgentId(agentId, {
      twilioSubaccountSid: subaccount.sid,
      twilioAuthTokenEncrypted: encrypt(subaccount.authToken),
      twilioPhoneNumber: phoneNumber.phoneNumber,
      twilioPhoneNumberSid: phoneNumber.sid,
      a2pStatus: 'pending',
      isActive: false, // Not active until A2P is approved
    })

    return transformSmsConfig(config)
  } catch (error) {
    console.error('SMS provisioning failed:', error)
    throw new Error(
      `SMS provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Configure AI settings for SMS responses
 */
export async function configureAiSettings(
  agentId: string,
  organizationId: string,
  settings: ConfigureAgentSmsAiRequest,
): Promise<AgentSmsConfigResponse> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  const config = await agentSmsConfigRepo.upsertByAgentId(agentId, {
    aiModel: settings.aiModel,
    aiSystemPrompt: settings.aiSystemPrompt || null,
    aiMaxTokens: settings.aiMaxTokens,
    aiTemperature: settings.aiTemperature,
  })

  return transformSmsConfig(config)
}

/**
 * Get SMS configuration for an agent
 */
export async function getSmsConfig(
  agentId: string,
  organizationId: string,
): Promise<AgentSmsConfigResponse | null> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config) {
    return null
  }

  return transformSmsConfig(config)
}

/**
 * Send an SMS on behalf of an agent
 */
export async function sendSms(
  agentId: string,
  organizationId: string,
  request: {
    leadId: string
    body: string
    workflowId?: string
    toPhone?: string // Optional override for phone number (for replies)
  },
): Promise<AgentMessageResponse> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  if (!agent.smsEnabled) {
    throw new Error('SMS is not enabled for this agent')
  }

  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config || !config.isActive) {
    throw new Error('SMS not configured or not active')
  }

  if (config.a2pStatus !== 'approved') {
    throw new Error('A2P registration not approved. Cannot send SMS.')
  }

  // Check daily limit
  const sentToday = await agentMessageRepo.countTodayByAgentIdAndType(
    agentId,
    'sms',
  )
  if (sentToday >= agent.dailySmsLimit) {
    throw new Error('Daily SMS limit reached')
  }

  // Use provided phone or get from lead
  let phoneNumber = request.toPhone

  if (!phoneNumber) {
    // Get lead phone
    const lead = await db
      .selectFrom('lead')
      .where('id', '=', request.leadId)
      .where('organizationId', '=', organizationId)
      .where('deletedAt', 'is', null)
      .select(['id', 'phone', 'normalizedPhone', 'firstName', 'lastName'])
      .executeTakeFirst()

    if (!lead) {
      throw new Error('Lead not found')
    }

    phoneNumber = lead.normalizedPhone || lead.phone || undefined
    if (!phoneNumber) {
      throw new Error('Lead has no phone number')
    }
  }

  // Create message record
  const message = await agentMessageRepo.create({
    agentId,
    workflowId: request.workflowId || null,
    leadId: request.leadId,
    messageType: 'sms',
    status: 'sending',
    smsBody: request.body,
    toPhone: phoneNumber,
  })

  // Send the SMS
  try {
    const twilioAuthToken = config.twilioAuthTokenEncrypted
      ? decrypt(config.twilioAuthTokenEncrypted)
      : null

    if (!twilioAuthToken || !config.twilioSubaccountSid) {
      throw new Error('Twilio credentials not configured')
    }

    const result = await sendViaTwilio(
      config.twilioSubaccountSid,
      twilioAuthToken,
      config.twilioPhoneNumber!,
      phoneNumber,
      request.body,
      config.twilioMessagingServiceSid || undefined,
    )

    // Update with Twilio message SID
    await agentMessageRepo.update(message.id, {
      status: 'sent',
      twilioMessageSid: result.messageSid,
    })

    const updated = await agentMessageRepo.findById(message.id)
    return transformMessage(updated!)
  } catch (error) {
    await agentMessageRepo.markFailed(
      message.id,
      error instanceof Error ? error.message : 'Unknown error',
    )
    throw error
  }
}

/**
 * Handle inbound SMS and generate AI response
 */
export async function handleInboundSms(
  agentId: string,
  fromPhone: string,
  body: string,
): Promise<{ response: string; leadId: string | null }> {
  const agent = await agentRepo.findById(agentId)
  if (!agent) {
    throw new Error('Agent not found')
  }

  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config) {
    throw new Error('SMS config not found')
  }

  // Find the lead by phone number
  const lead = await db
    .selectFrom('lead')
    .where('organizationId', '=', agent.organizationId)
    .where((eb) =>
      eb.or([
        eb('phone', '=', fromPhone),
        eb('normalizedPhone', '=', fromPhone),
      ]),
    )
    .where('deletedAt', 'is', null)
    .select(['id', 'firstName', 'company'])
    .executeTakeFirst()

  // Get conversation history
  const previousMessages = lead
    ? await agentMessageRepo.findByLeadId(lead.id)
    : []

  const agentMessages = previousMessages
    .filter((m) => m.messageType === 'sms')
    .map((m) => ({
      role: 'agent' as const,
      content: m.smsBody || '',
      timestamp: m.createdAt,
    }))

  const conversation: Array<{
    role: 'lead' | 'agent'
    content: string
    timestamp: Date
  }> = [
    ...agentMessages,
    {
      role: 'lead' as const,
      content: body,
      timestamp: new Date(),
    },
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Generate AI response
  const response = await outreachService.generateSmsResponse(
    {
      firstName: lead?.firstName,
      company: lead?.company,
    },
    conversation,
    {
      agentSystemPrompt: config.aiSystemPrompt || agent.systemPrompt,
      valueProposition: 'Schedule a call to learn more',
      maxChars: config.aiMaxTokens,
    },
  )

  return {
    response,
    leadId: lead?.id || null,
  }
}

/**
 * Activate SMS for an agent (after A2P approval)
 */
export async function activateSms(
  agentId: string,
  organizationId: string,
): Promise<AgentSmsConfigResponse> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config) {
    throw new Error('SMS not configured')
  }

  if (config.a2pStatus !== 'approved') {
    throw new Error('Cannot activate SMS until A2P is approved')
  }

  await agentSmsConfigRepo.setActive(agentId, true)

  const updated = await agentSmsConfigRepo.findByAgentId(agentId)
  return transformSmsConfig(updated!)
}

// Twilio API helpers

async function createTwilioSubaccount(
  friendlyName: string,
  organizationId: string,
): Promise<{ sid: string; authToken: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_MASTER_ACCOUNT_SID}:${TWILIO_MASTER_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        FriendlyName: `OmniDial Agent - ${friendlyName} (${organizationId.slice(0, 8)})`,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Twilio subaccount: ${error}`)
  }

  const data = await response.json()
  return {
    sid: data.sid,
    authToken: data.auth_token,
  }
}

async function purchasePhoneNumber(
  accountSid: string,
  authToken: string,
  areaCode: string,
  country: string,
): Promise<{ phoneNumber: string; sid: string }> {
  // Search for available numbers
  const searchResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?AreaCode=${areaCode}&SmsEnabled=true&VoiceEnabled=true`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    },
  )

  if (!searchResponse.ok) {
    throw new Error('No phone numbers available in the requested area code')
  }

  const searchData = await searchResponse.json()
  const availableNumbers = searchData.available_phone_numbers

  if (!availableNumbers || availableNumbers.length === 0) {
    throw new Error('No phone numbers available in the requested area code')
  }

  // Purchase the first available number
  const purchaseResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: availableNumbers[0].phone_number,
      }),
    },
  )

  if (!purchaseResponse.ok) {
    const error = await purchaseResponse.text()
    throw new Error(`Failed to purchase phone number: ${error}`)
  }

  const purchaseData = await purchaseResponse.json()
  return {
    phoneNumber: purchaseData.phone_number,
    sid: purchaseData.sid,
  }
}

async function sendViaTwilio(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  messagingServiceSid?: string,
): Promise<{ messageSid: string }> {
  const params: Record<string, string> = {
    To: to,
    Body: body,
  }

  // Use messaging service if available (for A2P), otherwise use from number
  if (messagingServiceSid) {
    params.MessagingServiceSid = messagingServiceSid
  } else {
    params.From = from
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio send failed: ${error}`)
  }

  const data = await response.json()
  return { messageSid: data.sid }
}

// Helper functions

function transformSmsConfig(
  config: NonNullable<
    Awaited<ReturnType<typeof agentSmsConfigRepo.findByAgentId>>
  >,
): AgentSmsConfigResponse {
  return {
    id: config.id,
    agentId: config.agentId,
    twilioPhoneNumber: config.twilioPhoneNumber,
    a2pStatus: config.a2pStatus,
    aiModel: config.aiModel,
    aiMaxTokens: config.aiMaxTokens,
    aiTemperature: config.aiTemperature,
    isActive: config.isActive,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  }
}

function transformMessage(
  message: NonNullable<Awaited<ReturnType<typeof agentMessageRepo.findById>>>,
): AgentMessageResponse {
  return {
    id: message.id,
    agentId: message.agentId,
    workflowId: message.workflowId,
    leadId: message.leadId,
    campaignId: message.campaignId,
    messageType: message.messageType,
    status: message.status,
    emailSubject: message.emailSubject,
    toEmail: message.toEmail,
    smsBody: message.smsBody,
    toPhone: message.toPhone,
    deliveredAt: message.deliveredAt?.toISOString() || null,
    openedAt: message.openedAt?.toISOString() || null,
    clickedAt: message.clickedAt?.toISOString() || null,
    failureReason: message.failureReason,
    createdAt: message.createdAt.toISOString(),
  }
}

/**
 * Find or create a lead by phone number for inbound SMS
 */
export async function findOrCreateLeadByPhone(
  agentId: string,
  phoneNumber: string,
): Promise<{ leadId: string; isNew: boolean }> {
  const agent = await agentRepo.findById(agentId)
  if (!agent) {
    throw new Error('Agent not found')
  }

  // Normalize the phone number
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '')

  // Try to find existing lead
  const existingLead = await db
    .selectFrom('lead')
    .where('organizationId', '=', agent.organizationId)
    .where((eb) =>
      eb.or([
        eb('phone', '=', phoneNumber),
        eb('phone', '=', normalizedPhone),
        eb('normalizedPhone', '=', normalizedPhone),
      ]),
    )
    .where('deletedAt', 'is', null)
    .select(['id'])
    .executeTakeFirst()

  if (existingLead) {
    return { leadId: existingLead.id, isNew: false }
  }

  // Create a new lead with just the phone number
  const newLead = await db
    .insertInto('lead')
    .values({
      id: crypto.randomUUID(),
      organizationId: agent.organizationId,
      phone: phoneNumber,
      normalizedPhone,
      firstName: 'Unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning(['id'])
    .executeTakeFirstOrThrow()

  return { leadId: newLead.id, isNew: true }
}

/**
 * Process an inbound SMS and generate/send an AI reply
 * Returns the response and whether it was auto-sent
 */
export async function processInboundAndReply(
  agentId: string,
  fromPhone: string,
  body: string,
  messageSid: string,
  leadId: string,
): Promise<{ response: string | null; autoSent: boolean }> {
  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config) {
    console.log(`No SMS config found for agent ${agentId}`)
    return { response: null, autoSent: false }
  }

  const agent = await agentRepo.findById(agentId)
  if (!agent) {
    console.log(`Agent not found: ${agentId}`)
    return { response: null, autoSent: false }
  }

  // Generate AI response using existing handleInboundSms
  const { response } = await handleInboundSms(agentId, fromPhone, body)

  if (!response) {
    return { response: null, autoSent: false }
  }

  // Check if autonomous mode is enabled
  const autonomousEnabled =
    (config as { autonomousEnabled?: boolean }).autonomousEnabled ?? false
  const maxRepliesPerLead =
    (config as { maxRepliesPerLead?: number }).maxRepliesPerLead ?? 5

  if (!autonomousEnabled) {
    // Send to Slack for approval (if Slack integration is configured)
    try {
      const slackService = await import('@/services/slack.service')
      await slackService.sendAgentApprovalRequest(agent.organizationId, {
        agentId,
        leadId,
        messageType: 'sms',
        draftContent: response,
        toPhone: fromPhone,
        inboundMessage: body,
      })
    } catch (error) {
      console.log('Slack approval not configured, storing draft only:', error)
    }
    return { response, autoSent: false }
  }

  // Check rate limits - count today's outbound messages to this lead
  const todayCount = await agentMessageRepo.countTodayByLeadAndType(
    leadId,
    'sms',
    'outbound',
  )

  if (todayCount >= maxRepliesPerLead) {
    console.log(
      `Rate limit reached for lead ${leadId}: ${todayCount}/${maxRepliesPerLead}`,
    )
    return { response, autoSent: false }
  }

  // Auto-send the response
  try {
    await sendSms(agentId, agent.organizationId, {
      leadId,
      body: response,
      toPhone: fromPhone,
    })
    return { response, autoSent: true }
  } catch (error) {
    console.error('Failed to auto-send SMS:', error)
    return { response, autoSent: false }
  }
}

/**
 * Update autonomous mode settings for an agent
 */
export async function updateAutonomousSettings(
  agentId: string,
  organizationId: string,
  settings: { autonomousEnabled?: boolean; maxRepliesPerLead?: number },
): Promise<AgentSmsConfigResponse> {
  const agent = await agentRepo.findById(agentId)
  if (!agent || agent.organizationId !== organizationId) {
    throw new Error('Agent not found')
  }

  const config = await agentSmsConfigRepo.findByAgentId(agentId)
  if (!config) {
    throw new Error('SMS not configured for this agent')
  }

  const updated = await agentSmsConfigRepo.updateAutonomousSettings(
    agentId,
    settings,
  )
  return transformSmsConfig(updated)
}
