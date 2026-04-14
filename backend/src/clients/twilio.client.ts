import twilio from 'twilio'
import {
  createTwilioClient,
  decryptAuthToken,
  TwilioCredentials,
} from '@/lib/twilio'
import * as twilioConfigRepository from '@/repositories/twilioConfig.repository'
import * as phoneProvisioningRepo from '@/repositories/phoneProvisioning.repository'

// Cache for Twilio clients per organization with timestamp
interface CachedClient {
  client: ReturnType<typeof twilio>
  createdAt: number
}

// Cache TTL: 5 minutes - refresh periodically to avoid stale credentials
const CACHE_TTL_MS = 5 * 60 * 1000

const clientCache = new Map<string, CachedClient>()

/**
 * Get or create a Twilio client for an organization.
 * For orgs that use the main account (usesMainAccount=true), always uses
 * current env vars to avoid stale DB credentials.
 */
export const getClientForOrganization = async (
  organizationId: string,
): Promise<ReturnType<typeof twilio>> => {
  const now = Date.now()

  // Check cache first
  const cached = clientCache.get(organizationId)
  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    return cached.client
  }

  // Clear stale cache entry if exists
  if (cached) {
    clientCache.delete(organizationId)
  }

  // Get config from database
  const config =
    await twilioConfigRepository.findByOrganizationId(organizationId)
  if (!config) {
    throw new Error(
      `No Twilio configuration found for organization ${organizationId}`,
    )
  }

  let accountSid = config.accountSid
  let authToken = decryptAuthToken(config.authTokenEncrypted)

  // For main-account orgs, always use current env vars
  const provisioning =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (
    provisioning?.usesMainAccount &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  ) {
    accountSid = process.env.TWILIO_ACCOUNT_SID
    authToken = process.env.TWILIO_AUTH_TOKEN
  }

  const credentials: TwilioCredentials = {
    accountSid,
    authToken,
  }

  const client = createTwilioClient(credentials)
  clientCache.set(organizationId, { client, createdAt: now })

  return client
}

/**
 * Clear cached client for an organization (e.g., when credentials are updated)
 */
export const clearClientCache = (organizationId: string): void => {
  clientCache.delete(organizationId)
}

/**
 * Clear all cached clients
 */
export const clearAllClientCache = (): void => {
  clientCache.clear()
}
