import twilio from 'twilio'
import { encrypt, decrypt } from '@/lib/encryption'
const { AccessToken } = twilio.jwt
const { VoiceGrant } = AccessToken

export interface TwilioCredentials {
  accountSid: string
  authToken: string
}

export interface CapabilityTokenOptions {
  identity: string
  ttl?: number
  apiKeySid?: string
  apiKeySecret?: string
}

/**
 * Create a Twilio client with given credentials
 */
export const createTwilioClient = (credentials: TwilioCredentials) => {
  return twilio(credentials.accountSid, credentials.authToken)
}

/**
 * Generate a capability token for Twilio Client SDK (browser)
 */
export const generateCapabilityToken = (
  credentials: TwilioCredentials,
  twimlAppSid: string,
  options: CapabilityTokenOptions,
): string => {
  const {
    identity,
    ttl = 3600,
    apiKeySid: overrideKeySid,
    apiKeySecret: overrideKeySecret,
  } = options

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  })

  // Use provided API key credentials, or fall back to env vars
  const apiKeySid = overrideKeySid || process.env.TWILIO_API_KEY_SID
  const apiKeySecret = overrideKeySecret || process.env.TWILIO_API_KEY_SECRET

  if (!apiKeySid || !apiKeySecret) {
    throw new Error(
      'TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET environment variables are required. ' +
        'Create an API Key at https://console.twilio.com/us1/account/keys',
    )
  }

  const token = new AccessToken(
    credentials.accountSid,
    apiKeySid,
    apiKeySecret,
    { identity, ttl },
  )

  token.addGrant(voiceGrant)

  return token.toJwt()
}

/**
 * Initiate an outbound call
 */
export const initiateCall = async (
  client: ReturnType<typeof twilio>,
  params: {
    to: string
    from: string
    url: string
    statusCallback?: string
    statusCallbackEvent?: string[]
    record?: boolean
  },
) => {
  const call = await client.calls.create({
    to: params.to,
    from: params.from,
    url: params.url,
    statusCallback: params.statusCallback,
    statusCallbackEvent: params.statusCallbackEvent || [
      'initiated',
      'ringing',
      'answered',
      'completed',
    ],
    record: params.record ?? true,
    recordingStatusCallback: params.statusCallback?.replace(
      '/status',
      '/recording',
    ),
  })

  return call
}

/**
 * End an active call
 */
export const endCall = async (
  client: ReturnType<typeof twilio>,
  callSid: string,
) => {
  const call = await client.calls(callSid).update({ status: 'completed' })
  return call
}

/**
 * Mute/unmute a call participant
 */
export const muteCall = async (
  client: ReturnType<typeof twilio>,
  conferenceSid: string,
  participantSid: string,
  muted: boolean,
) => {
  const participant = await client
    .conferences(conferenceSid)
    .participants(participantSid)
    .update({ muted })
  return participant
}

/**
 * Play a recording (voicemail drop) into a call
 */
export const playRecording = async (
  client: ReturnType<typeof twilio>,
  callSid: string,
  recordingUrl: string,
) => {
  // Update the call to play the recording via TwiML
  const call = await client.calls(callSid).update({
    twiml: `<Response><Play>${recordingUrl}</Play><Hangup/></Response>`,
  })
  return call
}

/**
 * Get call details from Twilio
 */
export const getCallDetails = async (
  client: ReturnType<typeof twilio>,
  callSid: string,
) => {
  const call = await client.calls(callSid).fetch()
  return call
}

/**
 * Get recording details from Twilio
 */
export const getRecording = async (
  client: ReturnType<typeof twilio>,
  recordingSid: string,
) => {
  const recording = await client.recordings(recordingSid).fetch()
  return recording
}

/**
 * Decrypt auth token using AES-256-GCM encryption
 */
export const decryptAuthToken = (encryptedToken: string): string => {
  // If the token doesn't look like our encrypted format (hex, min length for IV+tag+data),
  // treat it as plaintext (for backwards compatibility during migration)
  if (encryptedToken.length < 64 || !/^[0-9a-f]+$/i.test(encryptedToken)) {
    return encryptedToken
  }
  try {
    return decrypt(encryptedToken)
  } catch (err) {
    // Log the failure so we can diagnose credential issues
    console.error(
      '[twilio] Failed to decrypt auth token — returning plaintext fallback. ' +
        'This likely means ENCRYPTION_KEY changed since the token was stored. ' +
        'Error:',
      err instanceof Error ? err.message : err,
    )
    return encryptedToken
  }
}

/**
 * Encrypt auth token using AES-256-GCM encryption
 */
export const encryptAuthToken = (token: string): string => {
  return encrypt(token)
}
