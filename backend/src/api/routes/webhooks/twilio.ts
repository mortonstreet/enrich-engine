import { Router, Request, Response, NextFunction } from 'express'
import { createHash, randomUUID } from 'crypto'
import twilio from 'twilio'
import * as dialerService from '@/services/dialer.service'
import * as parallelDialerService from '@/services/parallelDialer.service'
import * as slackClickToCallService from '@/services/slackClickToCall.service'
import * as agentSmsService from '@/services/agentSms.service'
import * as callRepository from '@/repositories/call.repository'
import * as webhookEventReceiptRepository from '@/repositories/webhookEventReceipt.repository'
import * as twilioConfigRepository from '@/repositories/twilioConfig.repository'
import * as organizationRepository from '@/repositories/organization.repository'
import * as leadRepository from '@/repositories/lead.repository'
import * as agentSmsConfigRepository from '@/repositories/agentSmsConfig.repository'
import * as agentMessageRepository from '@/repositories/agentMessage.repository'
import * as voicemailGreetingRepository from '@/repositories/voicemailGreeting.repository'
import * as twilioClient from '@/clients/twilio.client'
import { config } from '@/config'
import { resolveCallStatusTransition } from '@/lib/callState'
import { decryptAuthToken } from '@/lib/twilio'
import logger from '@/lib/logger'
import * as usageTrackingService from '@/services/usageTracking.service'

// Helper to resolve organizationId from a call record
const resolveOrgIdFromCallId = async (
  callId: string,
): Promise<string | null> => {
  try {
    const call = await callRepository.findById(callId)
    if (!call) return null
    const cfg = await twilioConfigRepository.findById(call.twilioConfigId)
    return cfg?.organizationId ?? null
  } catch {
    return null
  }
}

// Helper to record usage for a completed call
const recordCallUsage = async (callId: string, duration: number) => {
  if (duration <= 0) return
  try {
    const orgId = await resolveOrgIdFromCallId(callId)
    if (orgId) {
      await usageTrackingService.recordCallMinutes(orgId, duration)
    }
  } catch (err) {
    logger.warn({ err, callId, duration }, 'Failed to record call usage')
  }
}

const { twiml } = twilio

const router = Router()
const WEBHOOK_PROVIDER = 'twilio'

type TwilioWebhookClaim = {
  eventKey: string
  duplicate: boolean
}

const compactDefined = <T extends object>(values: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>

const getRawBodyString = (req: Request): string | null => {
  const rawBody = (req as Request & { rawBody?: string | Buffer }).rawBody
  if (typeof rawBody === 'string') {
    return rawBody
  }
  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString('utf8')
  }
  return null
}

const buildTwilioEventKey = (
  routeKey: string,
  ids: Array<string | null | undefined>,
  eventState?: string | null,
): string | null => {
  const normalized = ids
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    .map((id) => encodeURIComponent(id.trim()))

  if (normalized.length === 0) {
    return null
  }

  if (eventState && eventState.trim() !== '') {
    normalized.push(encodeURIComponent(eventState.trim()))
  }

  return `${routeKey}:${normalized.join(':')}`
}

const claimTwilioWebhookEvent = async (
  req: Request,
  options: {
    routeKey: string
    ids: Array<string | null | undefined>
    eventState?: string | null
  },
): Promise<TwilioWebhookClaim | null> => {
  const eventKey = buildTwilioEventKey(
    options.routeKey,
    options.ids,
    options.eventState,
  )
  if (!eventKey) {
    return null
  }

  const rawBody = getRawBodyString(req)
  const payloadHash = rawBody
    ? createHash('sha256').update(rawBody).digest('hex')
    : undefined

  try {
    const claim = await webhookEventReceiptRepository.claimForProcessing({
      provider: WEBHOOK_PROVIDER,
      eventId: eventKey,
      eventType: options.routeKey,
      hash: payloadHash,
    })

    if (
      claim.status === 'duplicate_processed' ||
      claim.status === 'duplicate_processing'
    ) {
      if (claim.hashMismatch) {
        logger.warn(
          {
            routeKey: options.routeKey,
            eventKey,
          },
          'Twilio webhook replay had mismatched payload hash',
        )
      }
      return {
        eventKey,
        duplicate: true,
      }
    }

    return {
      eventKey,
      duplicate: false,
    }
  } catch (error) {
    logger.error(
      { error, routeKey: options.routeKey, eventKey },
      'Failed to claim Twilio webhook receipt',
    )
    return null
  }
}

const markTwilioWebhookProcessed = async (claim: TwilioWebhookClaim | null) => {
  if (!claim || claim.duplicate) {
    return
  }

  try {
    await webhookEventReceiptRepository.markProcessed(
      WEBHOOK_PROVIDER,
      claim.eventKey,
    )
  } catch (error) {
    logger.error(
      { error, eventKey: claim.eventKey },
      'Failed to mark Twilio webhook receipt as processed',
    )
  }
}

const markTwilioWebhookFailed = async (claim: TwilioWebhookClaim | null) => {
  if (!claim || claim.duplicate) {
    return
  }

  try {
    await webhookEventReceiptRepository.markFailed(
      WEBHOOK_PROVIDER,
      claim.eventKey,
    )
  } catch (error) {
    logger.error(
      { error, eventKey: claim.eventKey },
      'Failed to mark Twilio webhook receipt as failed',
    )
  }
}

type CallRecord = Awaited<ReturnType<typeof callRepository.findById>>

const applyCallUpdateWithPrecedence = async (
  currentCall: CallRecord,
  applyUpdate: (data: callRepository.UpdateCallInput) => Promise<CallRecord>,
  data: callRepository.UpdateCallInput,
): Promise<{
  call: CallRecord
  previousStatus: string | undefined
  statusChanged: boolean
}> => {
  if (!currentCall) {
    return {
      call: undefined,
      previousStatus: undefined,
      statusChanged: false,
    }
  }

  const previousStatus = currentCall.status
  const updateData = compactDefined(data) as callRepository.UpdateCallInput

  if (updateData.status) {
    const resolvedStatus = resolveCallStatusTransition(
      currentCall.status,
      updateData.status,
    )

    if (!resolvedStatus) {
      delete updateData.status
    } else {
      updateData.status = resolvedStatus
    }
  }

  if (Object.keys(updateData).length === 0) {
    return {
      call: currentCall,
      previousStatus,
      statusChanged: false,
    }
  }

  const updatedCall = await applyUpdate(updateData)

  return {
    call: updatedCall ?? currentCall,
    previousStatus,
    statusChanged: !!updatedCall && updatedCall.status !== previousStatus,
  }
}

const updateCallByIdWithPrecedence = async (
  callId: string,
  data: callRepository.UpdateCallInput,
) => {
  const currentCall = await callRepository.findById(callId)
  return applyCallUpdateWithPrecedence(
    currentCall,
    (updateData) => callRepository.update(callId, updateData),
    data,
  )
}

const updateCallByTwilioSidWithPrecedence = async (
  callSid: string,
  data: callRepository.UpdateCallInput,
) => {
  const currentCall = await callRepository.findByTwilioCallSid(callSid)
  return applyCallUpdateWithPrecedence(
    currentCall,
    (updateData) => callRepository.updateByTwilioCallSid(callSid, updateData),
    data,
  )
}

// ============================================
// TWILIO SIGNATURE VERIFICATION MIDDLEWARE
// ============================================

/**
 * Verify Twilio webhook request signature.
 * In production, all requests must be signed by Twilio.
 * In development, signature verification is optional.
 */
const verifyTwilioSignature = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip verification in development unless explicitly enabled
  if (config.nodeEnv !== 'production' && !process.env.VERIFY_TWILIO_SIGNATURE) {
    return next()
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string
  if (!twilioSignature) {
    const correlationId = randomUUID()
    logger.warn(
      {
        correlationId,
        route: req.originalUrl,
        method: req.method,
        reason: 'missing_signature',
      },
      'Twilio webhook signature verification failed',
    )
    return res.status(403).send('Forbidden')
  }

  try {
    // Reconstruct the full URL Twilio used to sign the request
    const fullUrl = `${config.backendUrl}${req.originalUrl}`

    // We need an auth token to validate. Try to find one from the request context.
    // For webhooks with a callId, look up the config from the call record.
    // Otherwise, try all configs (there are typically very few).
    const authToken = await resolveAuthToken(req)
    if (!authToken) {
      const correlationId = randomUUID()
      logger.warn(
        {
          correlationId,
          route: req.originalUrl,
          method: req.method,
          reason: 'auth_token_unresolved',
        },
        'Twilio webhook signature verification failed',
      )
      return res.status(403).send('Forbidden')
    }

    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      fullUrl,
      req.body || {},
    )

    if (!isValid) {
      const correlationId = randomUUID()
      logger.warn(
        {
          correlationId,
          route: req.originalUrl,
          method: req.method,
          reason: 'invalid_signature',
        },
        'Twilio webhook signature verification failed',
      )
      return res.status(403).send('Forbidden')
    }

    next()
  } catch (error) {
    const correlationId = randomUUID()
    logger.error(
      {
        error,
        correlationId,
        route: req.originalUrl,
        method: req.method,
        reason: 'verification_exception',
      },
      'Twilio webhook signature verification failed',
    )
    return res.status(403).send('Forbidden')
  }
}

/**
 * Resolve the Twilio auth token from request context.
 * Tries callId -> twilioConfig -> authToken chain first,
 * then falls back to iterating all configs.
 */
async function resolveAuthToken(req: Request): Promise<string | null> {
  // Try to get auth token from call context
  const callId = (req.query.callId as string) || req.body?.callId
  if (callId) {
    const call = await callRepository.findById(callId)
    if (call) {
      const twilioConfig = await twilioConfigRepository.findById(
        call.twilioConfigId,
      )
      if (twilioConfig) {
        return decryptAuthToken(twilioConfig.authTokenEncrypted)
      }
    }
  }

  // Try phone number from To field (inbound calls)
  const toNumber = req.body?.To
  if (toNumber && !toNumber.startsWith('client:')) {
    const twilioConfig =
      await twilioConfigRepository.findByPhoneNumber(toNumber)
    if (twilioConfig) {
      return decryptAuthToken(twilioConfig.authTokenEncrypted)
    }
  }

  // Fallback: use env-level auth token if available
  if (process.env.TWILIO_AUTH_TOKEN) {
    return process.env.TWILIO_AUTH_TOKEN
  }

  return null
}

// Apply signature verification to all routes
router.use(verifyTwilioSignature)

// ============================================
// VOICE WEBHOOKS
// ============================================

/**
 * Voice webhook - called when a call is initiated via Twilio Client SDK
 */
router.post('/voice', async (req: Request, res: Response) => {
  const { callId, To, From, Direction, CallSid, conferenceId } = req.body

  logger.info(
    { callId, direction: Direction, conferenceId },
    'Voice webhook received',
  )

  const response = new twiml.VoiceResponse()

  try {
    if (conferenceId) {
      const dial = response.dial()
      dial.conference(
        {
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
          beep: 'false',
          waitUrl: '',
        },
        conferenceId,
      )
      res.type('text/xml')
      return res.send(response.toString())
    }

    const isOutboundFromSDK =
      typeof callId === 'string' && To && !To.startsWith('client:')

    if (typeof callId === 'string' && CallSid) {
      await updateCallByIdWithPrecedence(callId, {
        twilioCallSid: CallSid,
        status: 'ringing',
      })
    }

    if (isOutboundFromSDK) {
      if (!From || From.trim() === '') {
        logger.error({ callId }, 'Missing From number for outbound call')
        response.say('Call failed. No caller ID was provided.')
        response.hangup()
        res.type('text/xml')
        return res.send(response.toString())
      }

      const conferenceId = `call-${callId}`

      const call = await callRepository.findById(callId)
      if (!call) {
        logger.error({ callId }, 'Call record not found')
        response.say('Call failed. Please try again.')
        response.hangup()
        res.type('text/xml')
        return res.send(response.toString())
      }

      const twilioConfig = await twilioConfigRepository.findById(
        call.twilioConfigId,
      )
      if (!twilioConfig) {
        logger.error({ callId }, 'Twilio config not found')
        response.say('Call failed. Dialer not configured.')
        response.hangup()
        res.type('text/xml')
        return res.send(response.toString())
      }

      const dial = response.dial({
        action: `${config.backendUrl}/api/webhooks/twilio/conference-end?callId=${callId}`,
      })
      dial.conference(
        {
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
          beep: 'false',
          waitUrl: `${config.backendUrl}/api/webhooks/twilio/ringback`,
          waitMethod: 'GET',
          record: 'record-from-start',
          recordingStatusCallback: `${config.backendUrl}/api/webhooks/twilio/recording?callId=${callId}`,
          statusCallback: `${config.backendUrl}/api/webhooks/twilio/conference-status?callId=${callId}`,
          statusCallbackEvent: ['start', 'end', 'join', 'leave'],
        },
        conferenceId,
      )

      setImmediate(async () => {
        try {
          const client = await twilioClient.getClientForOrganization(
            twilioConfig.organizationId,
          )

          logger.debug({ callId, conferenceId }, 'Dialing lead into conference')
          await client.calls.create({
            to: To,
            from: From,
            url: `${config.backendUrl}/api/webhooks/twilio/single-call-bridge?callId=${callId}&conferenceId=${encodeURIComponent(conferenceId)}`,
            statusCallback: `${config.backendUrl}/api/webhooks/twilio/dial-events?callId=${callId}`,
            statusCallbackEvent: [
              'initiated',
              'ringing',
              'answered',
              'completed',
            ],
          })
        } catch (error) {
          logger.error({ error, callId }, 'Failed to dial lead into conference')
        }
      })
    } else {
      logger.info({ direction: 'inbound' }, 'Routing inbound call')

      const twilioConfig = await twilioConfigRepository.findByPhoneNumber(To)

      if (!twilioConfig) {
        logger.warn('No organization found for inbound number')
        response.say(
          'Sorry, this number is not configured to receive calls. Please try again later.',
        )
        response.hangup()
        res.type('text/xml')
        return res.send(response.toString())
      }

      const members = await organizationRepository.findMembersByOrganizationId(
        twilioConfig.organizationId,
      )

      if (members.length === 0) {
        logger.warn(
          { orgId: twilioConfig.organizationId },
          'No members found for org',
        )
        response.say(
          'Sorry, no one is available to take your call. Please try again later.',
        )
        response.hangup()
        res.type('text/xml')
        return res.send(response.toString())
      }

      let matchedLead = null
      try {
        matchedLead = await leadRepository.findByPhone(
          twilioConfig.organizationId,
          From,
        )
        if (matchedLead) {
          logger.debug({ leadId: matchedLead.id }, 'Matched caller to lead')
        }
      } catch (error) {
        logger.error({ error }, 'Error matching caller to lead')
      }

      const existingCall = CallSid
        ? await callRepository.findByTwilioCallSid(CallSid)
        : null

      const callRecord =
        existingCall ??
        (await callRepository.create({
          twilioConfigId: twilioConfig.id,
          userId: members[0].userId,
          leadId: matchedLead?.id,
          twilioCallSid: CallSid,
          fromNumber: From,
          toNumber: To,
          direction: 'inbound',
          status: 'ringing',
        }))

      logger.info(
        {
          callId: callRecord.id,
          leadId: matchedLead?.id,
          reusedExisting: !!existingCall,
        },
        'Resolved inbound call record',
      )

      const dial = response.dial({
        callerId: From,
        timeout: 30,
        record: 'record-from-answer',
        recordingStatusCallback: `${config.backendUrl}/api/webhooks/twilio/recording?callId=${callRecord.id}`,
        action: `${config.backendUrl}/api/webhooks/twilio/voice/inbound/status?callId=${callRecord.id}`,
      })

      for (const member of members) {
        dial.client(member.userId)
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error handling voice webhook')
    response.say('An error occurred. Please try again later.')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Inbound call webhook - alternative endpoint for specific Twilio numbers
 */
router.post('/voice/inbound', async (req: Request, res: Response) => {
  const { CallSid, From, To } = req.body

  logger.info({ direction: 'inbound' }, 'Inbound voice webhook received')

  const response = new twiml.VoiceResponse()

  try {
    const twilioConfig = await twilioConfigRepository.findByPhoneNumber(To)

    if (!twilioConfig) {
      logger.warn('No organization found for inbound number')
      response.say(
        'Sorry, this number is not configured to receive calls. Please try again later.',
      )
      response.hangup()
      res.type('text/xml')
      return res.send(response.toString())
    }

    const members = await organizationRepository.findMembersByOrganizationId(
      twilioConfig.organizationId,
    )

    if (members.length === 0) {
      logger.warn(
        { orgId: twilioConfig.organizationId },
        'No members found for org',
      )
      response.say(
        'Sorry, no one is available to take your call. Please try again later.',
      )
      response.hangup()
      res.type('text/xml')
      return res.send(response.toString())
    }

    let matchedLead = null
    try {
      matchedLead = await leadRepository.findByPhone(
        twilioConfig.organizationId,
        From,
      )
      if (matchedLead) {
        logger.debug({ leadId: matchedLead.id }, 'Matched caller to lead')
      }
    } catch (error) {
      logger.error({ error }, 'Error matching caller to lead')
    }

    const existingCall = CallSid
      ? await callRepository.findByTwilioCallSid(CallSid)
      : null

    const callRecord =
      existingCall ??
      (await callRepository.create({
        twilioConfigId: twilioConfig.id,
        userId: members[0].userId,
        leadId: matchedLead?.id,
        twilioCallSid: CallSid,
        fromNumber: From,
        toNumber: To,
        direction: 'inbound',
        status: 'ringing',
      }))

    logger.info(
      {
        callId: callRecord.id,
        leadId: matchedLead?.id,
        reusedExisting: !!existingCall,
      },
      'Resolved inbound call record',
    )

    const dial = response.dial({
      callerId: From,
      timeout: 30,
      action: `${config.backendUrl}/api/webhooks/twilio/voice/inbound/status?callId=${callRecord.id}`,
      record: 'record-from-answer',
      recordingStatusCallback: `${config.backendUrl}/api/webhooks/twilio/recording?callId=${callRecord.id}`,
    })

    for (const member of members) {
      dial.client(member.userId)
    }
  } catch (error) {
    logger.error({ error }, 'Error handling inbound call')
    response.say(
      'Sorry, we cannot take your call right now. Please try again later.',
    )
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Inbound call status webhook - called after dial completes
 */
router.post('/voice/inbound/status', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { CallSid, DialCallStatus, DialCallDuration } = req.body

  logger.info(
    { callId, dialCallStatus: DialCallStatus },
    'Inbound status webhook',
  )

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'voice/inbound/status',
    ids: [typeof callId === 'string' ? callId : null, CallSid],
    eventState: DialCallStatus,
  })

  if (claim?.duplicate) {
    response.hangup()
    res.type('text/xml')
    return res.send(response.toString())
  }

  try {
    const duration = DialCallDuration ? parseInt(DialCallDuration, 10) : 0

    if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy') {
      if (typeof callId === 'string') {
        await updateCallByIdWithPrecedence(callId, {
          status: 'missed',
          endedAt: new Date(),
        })
      } else if (CallSid) {
        await updateCallByTwilioSidWithPrecedence(CallSid, {
          status: 'missed',
          endedAt: new Date(),
        })
      }

      let usedCustomGreeting = false
      if (typeof callId === 'string') {
        try {
          const call = await callRepository.findById(callId)
          if (call) {
            const activeGreeting =
              await voicemailGreetingRepository.findActiveByTwilioConfigId(
                call.twilioConfigId,
              )
            if (activeGreeting) {
              response.play(activeGreeting.recordingUrl)
              usedCustomGreeting = true
            }
          }
        } catch (error) {
          logger.error({ error }, 'Error looking up voicemail greeting')
        }
      }

      if (!usedCustomGreeting) {
        response.say(
          'Sorry, no one is available to take your call. Please leave a message after the beep.',
        )
      }

      response.record({
        maxLength: 120,
        action: `${config.backendUrl}/api/webhooks/twilio/voicemail?callId=${callId || ''}`,
        transcribe: false,
      })
    } else if (
      DialCallStatus === 'completed' ||
      DialCallStatus === 'answered'
    ) {
      if (typeof callId === 'string') {
        const updateResult = await updateCallByIdWithPrecedence(callId, {
          status: 'completed',
          answeredAt: new Date(),
          endedAt: new Date(),
          duration,
        })

        if (
          updateResult.statusChanged &&
          updateResult.call?.status === 'completed'
        ) {
          await recordCallUsage(callId, duration)
        }
      } else if (CallSid) {
        await updateCallByTwilioSidWithPrecedence(CallSid, {
          status: 'completed',
          answeredAt: new Date(),
          endedAt: new Date(),
          duration,
        })
      }
      response.hangup()
    } else {
      if (typeof callId === 'string') {
        await updateCallByIdWithPrecedence(callId, {
          status: 'failed',
          endedAt: new Date(),
        })
      }
      response.hangup()
    }

    await markTwilioWebhookProcessed(claim)
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling inbound status')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Dial status webhook - called when dial verb completes (outbound calls)
 */
router.post('/dial-status', async (req: Request, res: Response) => {
  const { callId, DialCallStatus, DialCallDuration, CallSid, DialCallSid } =
    req.body

  logger.info({ callId, dialCallStatus: DialCallStatus }, 'Dial status webhook')

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'dial-status',
    ids: [callId, CallSid, DialCallSid],
    eventState: DialCallStatus,
  })

  if (claim?.duplicate) {
    response.hangup()
    res.type('text/xml')
    return res.send(response.toString())
  }

  try {
    if (typeof callId === 'string') {
      const duration = DialCallDuration ? parseInt(DialCallDuration, 10) : 0

      if (DialCallStatus === 'completed' || DialCallStatus === 'answered') {
        const updateResult = await updateCallByIdWithPrecedence(callId, {
          status: 'completed',
          answeredAt: new Date(),
          endedAt: new Date(),
          duration,
          dialCallSid: DialCallSid,
        })

        if (
          updateResult.statusChanged &&
          updateResult.call?.status === 'completed'
        ) {
          await recordCallUsage(callId, duration)
        }
      } else if (
        DialCallStatus === 'busy' ||
        DialCallStatus === 'no-answer' ||
        DialCallStatus === 'failed' ||
        DialCallStatus === 'canceled'
      ) {
        await updateCallByIdWithPrecedence(callId, {
          status: 'failed',
          endedAt: new Date(),
          dialCallSid: DialCallSid,
        })
      }
    }

    await markTwilioWebhookProcessed(claim)
    response.hangup()
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling dial status')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Dial events webhook - called for child call (outbound leg) status changes
 */
router.post('/dial-events', async (req: Request, res: Response) => {
  const { callId, CallSid, CallStatus } = req.body

  logger.debug({ callId, callStatus: CallStatus }, 'Dial event received')
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'dial-events',
    ids: [callId, CallSid],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (typeof callId === 'string' && CallSid) {
      const updateData: callRepository.UpdateCallInput = {
        dialCallSid: CallSid,
      }
      if (CallStatus === 'in-progress') {
        updateData.status = 'in-progress'
        updateData.answeredAt = new Date()
      }

      await updateCallByIdWithPrecedence(callId, updateData)
    }

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling dial events')
    res.status(500).send('Error')
  }
})

/**
 * Call status callback - called for each status change
 */
router.post('/status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration, Direction } = req.body

  logger.debug(
    { callStatus: CallStatus, direction: Direction },
    'Status callback',
  )
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'status',
    ids: [CallSid],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    let status = CallStatus
    if (CallStatus === 'in-progress') {
      status = 'in-progress'
    } else if (CallStatus === 'completed') {
      status = 'completed'
    } else if (
      CallStatus === 'busy' ||
      CallStatus === 'no-answer' ||
      CallStatus === 'canceled'
    ) {
      status = Direction === 'inbound' ? 'missed' : 'failed'
    } else if (CallStatus === 'failed') {
      status = 'failed'
    }

    if (CallSid) {
      await dialerService.updateCallStatus(
        CallSid,
        status,
        CallDuration ? parseInt(CallDuration, 10) : undefined,
      )
    }

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling status callback')
    res.status(500).send('Error')
  }
})

/**
 * Recording callback - called when a recording is ready
 */
router.post('/recording', async (req: Request, res: Response) => {
  const { callId } = req.query
  const {
    CallSid,
    ConferenceSid,
    RecordingSid,
    RecordingUrl,
    RecordingStatus,
  } = req.body

  logger.info(
    { callId, recordingStatus: RecordingStatus },
    'Recording callback',
  )
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'recording',
    ids: [
      typeof callId === 'string' ? callId : null,
      CallSid,
      ConferenceSid,
      RecordingSid,
    ],
    eventState: RecordingStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (RecordingStatus === 'completed') {
      const recordingUrlWithFormat = `${RecordingUrl}.mp3`

      let updated = null

      if (typeof callId === 'string') {
        updated = await callRepository.update(callId, {
          recordingUrl: recordingUrlWithFormat,
          recordingSid: RecordingSid,
        })
      }

      if (!updated) {
        updated = await dialerService.updateCallRecording(
          CallSid,
          recordingUrlWithFormat,
          RecordingSid,
        )
      }

      if (!updated && ConferenceSid) {
        updated = await callRepository.updateByConferenceSid(ConferenceSid, {
          recordingUrl: recordingUrlWithFormat,
          recordingSid: RecordingSid,
        })
      }

      if (!updated) {
        logger.warn(
          { callId, conferenceSid: ConferenceSid },
          'Could not find call for recording',
        )
      }
    }

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling recording callback')
    res.status(500).send('Error')
  }
})

/**
 * Voicemail webhook - called when a voicemail is left
 */
router.post('/voicemail', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body

  logger.info({ callId, RecordingDuration }, 'Voicemail webhook received')

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'voicemail',
    ids: [typeof callId === 'string' ? callId : null, CallSid, RecordingSid],
    eventState: RecordingDuration,
  })

  if (claim?.duplicate) {
    response.say('Thank you for your message. Goodbye.')
    response.hangup()
    res.type('text/xml')
    return res.send(response.toString())
  }

  try {
    if (RecordingUrl) {
      const recordingUrlWithFormat = `${RecordingUrl}.mp3`
      const duration = RecordingDuration
        ? parseInt(RecordingDuration, 10)
        : undefined

      if (typeof callId === 'string') {
        await updateCallByIdWithPrecedence(callId, {
          recordingUrl: recordingUrlWithFormat,
          recordingSid: RecordingSid || undefined,
          voicemailLeft: true,
          status: 'completed',
          duration,
          endedAt: new Date(),
        })
      } else if (CallSid) {
        // Fallback: update by CallSid — still mark as voicemail
        await updateCallByTwilioSidWithPrecedence(CallSid, {
          recordingUrl: recordingUrlWithFormat,
          recordingSid: RecordingSid || '',
          voicemailLeft: true,
          status: 'completed',
          duration,
          endedAt: new Date(),
        })
      }
    }

    await markTwilioWebhookProcessed(claim)
    response.say('Thank you for your message. Goodbye.')
    response.hangup()
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling voicemail')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Greeting Record webhook - Returns TwiML for recording a voicemail greeting
 */
router.post('/greeting-record', async (_req: Request, res: Response) => {
  logger.debug('Greeting record webhook received')

  const response = new twiml.VoiceResponse()

  response.say(
    'Please record your voicemail greeting after the beep. Press the pound key when finished.',
  )
  response.record({
    maxLength: 120,
    finishOnKey: '#',
    action: `${config.backendUrl}/api/webhooks/twilio/greeting-recorded`,
    playBeep: true,
  })

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Greeting Recorded webhook - Called after a greeting recording is completed
 */
router.post('/greeting-recorded', async (req: Request, res: Response) => {
  const { RecordingUrl, RecordingSid } = req.body

  logger.info({ hasRecording: !!RecordingUrl }, 'Greeting recorded webhook')

  const response = new twiml.VoiceResponse()

  try {
    if (RecordingUrl) {
      response.say('Your greeting has been recorded. Goodbye.')
    } else {
      response.say('No recording was received. Please try again.')
    }
    response.hangup()
  } catch (error) {
    logger.error({ error }, 'Error handling greeting recorded')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

// ============================================
// PARALLEL DIAL WEBHOOKS
// ============================================

/**
 * Parallel Dial Answered webhook
 */
router.post('/parallel-dial-answered', async (req: Request, res: Response) => {
  const { attemptId, sessionId } = req.query
  const { CallSid, CallStatus } = req.body

  logger.info({ attemptId, callStatus: CallStatus }, 'Parallel dial answered')

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'parallel-dial-answered',
    ids: [
      typeof attemptId === 'string' ? attemptId : null,
      typeof sessionId === 'string' ? sessionId : null,
      CallSid,
    ],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    if (typeof sessionId === 'string') {
      const session = await parallelDialerService.getSession(sessionId)
      if (session?.conferenceId) {
        const dial = response.dial()
        dial.conference(
          {
            startConferenceOnEnter: true,
            endConferenceOnExit: false,
            beep: 'false',
            waitUrl: '',
          },
          session.conferenceId,
        )
      } else {
        response.hangup()
      }
    } else {
      response.hangup()
    }
    res.type('text/xml')
    return res.send(response.toString())
  }

  try {
    if (!attemptId || typeof attemptId !== 'string') {
      logger.error('Missing attemptId in parallel dial answered webhook')
      response.say('Call failed due to system error.')
      response.hangup()
      await markTwilioWebhookProcessed(claim)
      res.type('text/xml')
      return res.send(response.toString())
    }

    const result = await parallelDialerService.handleCallAnswered(
      attemptId,
      CallSid,
    )

    logger.info(
      {
        conferenceId: result.conferenceId,
        abandonedCount: result.abandonedCount,
      },
      'Lead connected to conference',
    )

    const dial = response.dial()
    dial.conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        beep: 'false',
        waitUrl: '',
        record: 'record-from-start',
        recordingStatusCallback: `${config.backendUrl}/api/webhooks/twilio/recording`,
      },
      result.conferenceId,
    )

    await markTwilioWebhookProcessed(claim)
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling parallel dial answered webhook')
    response.say('An error occurred connecting your call.')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Parallel Dial Abandoned webhook
 */
router.post(
  '/parallel-dial-abandoned',
  async (_req: Request, res: Response) => {
    logger.debug('Parallel dial abandoned webhook')

    const response = new twiml.VoiceResponse()

    try {
      response.say(
        { voice: 'Polly.Joanna' },
        'Thank you for your patience. We will call you back shortly.',
      )
      response.hangup()
    } catch (error) {
      logger.error({ error }, 'Error handling parallel dial abandoned webhook')
      response.hangup()
    }

    res.type('text/xml')
    res.send(response.toString())
  },
)

/**
 * Parallel Dial AMD webhook
 */
router.post('/parallel-dial-amd', async (req: Request, res: Response) => {
  const { attemptId } = req.query
  const { CallSid, AnsweredBy } = req.body

  logger.info({ attemptId, answeredBy: AnsweredBy }, 'Parallel dial AMD')
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'parallel-dial-amd',
    ids: [typeof attemptId === 'string' ? attemptId : null, CallSid],
    eventState: AnsweredBy,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (!attemptId || typeof attemptId !== 'string') {
      logger.error('Missing attemptId in parallel dial AMD webhook')
      await markTwilioWebhookProcessed(claim)
      return res.status(200).send('OK')
    }

    await parallelDialerService.handleAmdResult(attemptId, CallSid, AnsweredBy)

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling parallel dial AMD webhook')
    res.status(500).send('Error')
  }
})

/**
 * Parallel Dial Status webhook
 */
router.post('/parallel-dial-status', async (req: Request, res: Response) => {
  const { attemptId } = req.query
  const { CallSid, CallStatus } = req.body

  logger.debug({ attemptId, callStatus: CallStatus }, 'Parallel dial status')
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'parallel-dial-status',
    ids: [typeof attemptId === 'string' ? attemptId : null, CallSid],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (!attemptId || typeof attemptId !== 'string') {
      logger.error('Missing attemptId in parallel dial status webhook')
      await markTwilioWebhookProcessed(claim)
      return res.status(200).send('OK')
    }

    await parallelDialerService.handleCallStatusUpdate(attemptId, CallStatus)

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling parallel dial status webhook')
    res.status(500).send('Error')
  }
})

/**
 * Parallel Dial Join Conference webhook
 */
router.post('/parallel-dial-join', async (req: Request, res: Response) => {
  const { conferenceId } = req.body

  logger.debug({ conferenceId }, 'Parallel dial join conference')

  const response = new twiml.VoiceResponse()

  try {
    if (!conferenceId) {
      logger.error('Missing conferenceId in parallel dial join webhook')
      response.say('Unable to join conference. Missing conference ID.')
      response.hangup()
      res.type('text/xml')
      return res.send(response.toString())
    }

    const dial = response.dial()
    dial.conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        beep: 'false',
        waitUrl: '',
      },
      conferenceId,
    )
  } catch (error) {
    logger.error({ error }, 'Error handling parallel dial join webhook')
    response.say('An error occurred joining the conference.')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Single Call Bridge webhook - lead answers conference-based outbound call
 */
router.post('/single-call-bridge', async (req: Request, res: Response) => {
  const { callId, conferenceId } = req.query
  const { CallSid } = req.body

  logger.info({ callId, conferenceId }, 'Single call bridge webhook')

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'single-call-bridge',
    ids: [
      typeof callId === 'string' ? callId : null,
      CallSid,
      typeof conferenceId === 'string' ? conferenceId : null,
    ],
  })
  const shouldApplySideEffects = !claim?.duplicate

  try {
    if (!conferenceId || typeof conferenceId !== 'string') {
      logger.error('Missing conferenceId in single call bridge webhook')
      response.say('Call failed due to system error.')
      response.hangup()
      await markTwilioWebhookProcessed(claim)
      res.type('text/xml')
      return res.send(response.toString())
    }

    if (shouldApplySideEffects && callId && typeof callId === 'string') {
      await updateCallByIdWithPrecedence(callId, {
        dialCallSid: CallSid,
        status: 'in-progress',
        answeredAt: new Date(),
      })
    }

    const dial = response.dial()
    dial.conference(
      {
        startConferenceOnEnter: false,
        endConferenceOnExit: false,
        beep: 'false',
        waitUrl: '',
      },
      conferenceId,
    )

    if (shouldApplySideEffects) {
      await markTwilioWebhookProcessed(claim)
    }
  } catch (error) {
    if (shouldApplySideEffects) {
      await markTwilioWebhookFailed(claim)
    }
    logger.error({ error }, 'Error handling single call bridge webhook')
    response.say('An error occurred connecting your call.')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Conference Status webhook - captures conferenceSid for manager listen
 */
router.post('/conference-status', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { ConferenceSid, StatusCallbackEvent } = req.body

  logger.debug(
    { callId, event: StatusCallbackEvent },
    'Conference status webhook',
  )
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'conference-status',
    ids: [typeof callId === 'string' ? callId : null, ConferenceSid],
    eventState: StatusCallbackEvent,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (callId && typeof callId === 'string' && ConferenceSid) {
      if (StatusCallbackEvent === 'conference-start') {
        await callRepository.update(callId, {
          conferenceSid: ConferenceSid,
        })
      }
    }

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling conference status webhook')
    res.status(500).send('Error')
  }
})

/**
 * Conference End webhook - rep leaves conference
 */
router.post('/conference-end', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { DialCallStatus, DialCallDuration } = req.body

  logger.info(
    { callId, dialCallStatus: DialCallStatus },
    'Conference end webhook',
  )

  const response = new twiml.VoiceResponse()
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'conference-end',
    ids: [typeof callId === 'string' ? callId : null],
    eventState: DialCallStatus,
  })

  if (claim?.duplicate) {
    response.hangup()
    res.type('text/xml')
    return res.send(response.toString())
  }

  try {
    if (callId && typeof callId === 'string') {
      const duration = DialCallDuration ? parseInt(DialCallDuration, 10) : 0

      const updateResult = await updateCallByIdWithPrecedence(callId, {
        status: 'completed',
        endedAt: new Date(),
        duration,
      })

      if (
        updateResult.statusChanged &&
        updateResult.call?.status === 'completed'
      ) {
        await recordCallUsage(callId, duration)
      }
    }

    await markTwilioWebhookProcessed(claim)
    response.hangup()
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling conference end webhook')
    response.hangup()
  }

  res.type('text/xml')
  res.send(response.toString())
})

/**
 * Ringback tone webhook
 */
router.get('/ringback', async (_req: Request, res: Response) => {
  const response = new twiml.VoiceResponse()

  response.play(
    { loop: 0 },
    `${config.backendUrl}/static/audio/us-ringback.ogg`,
  )

  res.type('text/xml')
  res.send(response.toString())
})

router.post('/ringback', async (_req: Request, res: Response) => {
  const response = new twiml.VoiceResponse()

  response.play(
    { loop: 0 },
    `${config.backendUrl}/static/audio/us-ringback.ogg`,
  )

  res.type('text/xml')
  res.send(response.toString())
})

// ============================================
// SLACK CLICK-TO-CALL WEBHOOKS
// ============================================

router.post('/slack-call-rep-answered', async (req: Request, res: Response) => {
  const { callId, leadPhone, fromNumber, conferenceId } = req.query

  logger.info({ callId, conferenceId }, 'Slack click-to-call: rep answered')

  try {
    const twimlResponse = await slackClickToCallService.handleRepAnswered({
      callId: callId as string,
      leadPhone: leadPhone as string,
      fromNumber: fromNumber as string,
      conferenceId: conferenceId as string,
    })

    res.type('text/xml')
    res.send(twimlResponse)
  } catch (error) {
    logger.error({ error }, 'Error handling Slack rep answered webhook')

    const response = new twiml.VoiceResponse()
    response.say('Sorry, there was an error connecting your call.')
    response.hangup()

    res.type('text/xml')
    res.send(response.toString())
  }
})

router.post('/slack-call-bridge', async (req: Request, res: Response) => {
  const { callId, conferenceId } = req.query
  const { CallSid } = req.body

  logger.info({ callId, conferenceId }, 'Slack click-to-call: bridge lead')

  try {
    if (callId && typeof callId === 'string') {
      await callRepository.update(callId, {
        dialCallSid: CallSid,
      })
    }

    const response = new twiml.VoiceResponse()
    const dial = response.dial()
    dial.conference(
      {
        startConferenceOnEnter: false,
        endConferenceOnExit: false,
        beep: 'false',
        waitUrl: '',
      },
      conferenceId as string,
    )

    res.type('text/xml')
    res.send(response.toString())
  } catch (error) {
    logger.error({ error }, 'Error handling Slack bridge webhook')

    const response = new twiml.VoiceResponse()
    response.say('Sorry, there was an error connecting your call.')
    response.hangup()

    res.type('text/xml')
    res.send(response.toString())
  }
})

router.post('/slack-call-status', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { CallStatus, CallDuration } = req.body

  logger.debug({ callId, callStatus: CallStatus }, 'Slack call status')
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'slack-call-status',
    ids: [typeof callId === 'string' ? callId : null],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    await slackClickToCallService.handleCallStatusUpdate({
      callId: callId as string,
      callStatus: CallStatus,
      callDuration: CallDuration ? parseInt(CallDuration, 10) : undefined,
    })

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling Slack call status webhook')
    res.status(500).send('Error')
  }
})

router.post('/slack-call-lead-status', async (req: Request, res: Response) => {
  const { callId } = req.query
  const { CallStatus } = req.body

  logger.debug({ callId, callStatus: CallStatus }, 'Slack lead status')
  const claim = await claimTwilioWebhookEvent(req, {
    routeKey: 'slack-call-lead-status',
    ids: [typeof callId === 'string' ? callId : null],
    eventState: CallStatus,
  })

  if (claim?.duplicate) {
    return res.status(200).send('OK')
  }

  try {
    if (callId && typeof callId === 'string') {
      if (CallStatus === 'answered' || CallStatus === 'in-progress') {
        await slackClickToCallService.handleCallStatusUpdate({
          callId,
          callStatus: 'in-progress',
        })
      } else if (
        CallStatus === 'busy' ||
        CallStatus === 'no-answer' ||
        CallStatus === 'failed' ||
        CallStatus === 'canceled'
      ) {
        await slackClickToCallService.handleCallStatusUpdate({
          callId,
          callStatus: CallStatus,
        })
      }
    }

    await markTwilioWebhookProcessed(claim)
    res.status(200).send('OK')
  } catch (error) {
    await markTwilioWebhookFailed(claim)
    logger.error({ error }, 'Error handling Slack lead status webhook')
    res.status(500).send('Error')
  }
})

// ============================================
// AGENT SMS WEBHOOKS
// ============================================

router.post('/sms/inbound', async (req: Request, res: Response) => {
  const { From, To, Body, MessageSid } = req.body

  logger.info({ messageSid: MessageSid }, 'Agent SMS inbound webhook')

  const response = new twiml.MessagingResponse()

  try {
    const smsConfig = await agentSmsConfigRepository.findByPhoneNumber(To)
    if (!smsConfig) {
      logger.debug('No agent SMS config found for phone number')
      res.type('text/xml')
      return res.send(response.toString())
    }

    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
    if (optOutKeywords.includes(Body.toUpperCase().trim())) {
      logger.info({ agentId: smsConfig.agentId }, 'SMS opt-out request')
      response.message(
        'You have been unsubscribed and will no longer receive messages from this number.',
      )
      res.type('text/xml')
      return res.send(response.toString())
    }

    const { leadId } = await agentSmsService.findOrCreateLeadByPhone(
      smsConfig.agentId,
      From,
    )

    await agentMessageRepository.createInbound({
      agentId: smsConfig.agentId,
      fromPhone: From,
      toPhone: To,
      smsBody: Body,
      twilioMessageSid: MessageSid,
      leadId,
    })

    const result = await agentSmsService.processInboundAndReply(
      smsConfig.agentId,
      From,
      Body,
      MessageSid,
      leadId,
    )

    if (result.autoSent) {
      logger.debug({ agentId: smsConfig.agentId }, 'Auto-reply sent')
    }

    res.type('text/xml')
    res.send(response.toString())
  } catch (error) {
    logger.error({ error }, 'Error handling inbound SMS')
    res.type('text/xml')
    res.send(response.toString())
  }
})

router.post('/sms/status', async (req: Request, res: Response) => {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body

  logger.debug(
    { messageSid: MessageSid, messageStatus: MessageStatus },
    'SMS status callback',
  )

  try {
    const message =
      await agentMessageRepository.findByTwilioMessageSid(MessageSid)
    if (!message) {
      return res.status(200).send('OK')
    }

    let status = message.status
    switch (MessageStatus) {
      case 'queued':
      case 'sending':
        status = 'sending'
        break
      case 'sent':
        status = 'sent'
        break
      case 'delivered':
        status = 'delivered'
        break
      case 'failed':
      case 'undelivered':
        status = 'failed'
        break
    }

    const updateData: Parameters<typeof agentMessageRepository.update>[1] = {
      status,
    }

    if (status === 'delivered') {
      updateData.deliveredAt = new Date()
    } else if (status === 'failed' && ErrorMessage) {
      updateData.failureReason = `${ErrorCode}: ${ErrorMessage}`
    }

    await agentMessageRepository.update(message.id, updateData)

    res.status(200).send('OK')
  } catch (error) {
    logger.error({ error }, 'Error handling SMS status callback')
    res.status(500).send('Error')
  }
})

export default router
