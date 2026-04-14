import OpenAI, { toFile } from 'openai'
import * as twilioConfigRepository from '@/repositories/twilioConfig.repository'
import { decryptAuthToken } from '@/lib/twilio'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// Initialize OpenAI client lazily
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required for transcription',
    )
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY })
  }
  return openaiClient
}

export interface TranscriptionResult {
  text: string
  source: 'openai-whisper'
}

/**
 * Fetch a recording from Twilio with Basic auth
 */
async function fetchTwilioRecording(
  recordingUrl: string,
  accountSid: string,
  authToken: string,
): Promise<ArrayBuffer> {
  // Ensure we're requesting the .mp3 format
  const mp3Url = recordingUrl.endsWith('.mp3')
    ? recordingUrl
    : `${recordingUrl}.mp3`

  const authString = Buffer.from(`${accountSid}:${authToken}`).toString(
    'base64',
  )

  const response = await fetch(mp3Url, {
    headers: {
      Authorization: `Basic ${authString}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch recording from Twilio: ${response.status} ${response.statusText}`,
    )
  }

  return response.arrayBuffer()
}

/**
 * Transcribe a recording using OpenAI Whisper API
 */
export async function transcribeRecording(
  recordingUrl: string,
  organizationId: string,
): Promise<TranscriptionResult> {
  const openai = getOpenAIClient()

  // Get Twilio config for this organization
  const twilioConfig =
    await twilioConfigRepository.findByOrganizationId(organizationId)
  if (!twilioConfig) {
    throw new Error(`No Twilio configuration found for organization`)
  }

  const authToken = decryptAuthToken(twilioConfig.authTokenEncrypted)

  // Fetch the recording from Twilio
  const audioBuffer = await fetchTwilioRecording(
    recordingUrl,
    twilioConfig.accountSid,
    authToken,
  )

  // Convert to File object for OpenAI SDK
  const audioFile = await toFile(Buffer.from(audioBuffer), 'recording.mp3', {
    type: 'audio/mpeg',
  })

  // Send to OpenAI Whisper API
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'text',
  })

  return {
    text: transcription,
    source: 'openai-whisper',
  }
}

/**
 * Check if transcription is available (OPENAI_API_KEY is configured)
 */
export function isTranscriptionAvailable(): boolean {
  return Boolean(OPENAI_API_KEY)
}
