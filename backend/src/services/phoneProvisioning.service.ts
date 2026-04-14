import * as phoneProvisioningRepo from '@/repositories/phoneProvisioning.repository'
import * as twilioConfigRepo from '@/repositories/twilioConfig.repository'
import * as subscriptionRepo from '@/repositories/subscription.repository'
import { encrypt, decrypt } from '@/lib/encryption'
import { stripeClient } from '@/lib/stripe'
import { config } from '@/config'
import logger from '@/lib/logger'

const TWILIO_MASTER_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_MASTER_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const SHARED_TRIAL_AREA_CODE = process.env.SHARED_TRIAL_AREA_CODE || '415'

if (!TWILIO_MASTER_ACCOUNT_SID || !TWILIO_MASTER_AUTH_TOKEN) {
  logger.warn(
    'Twilio master credentials not configured — phone provisioning will fail. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
  )
}

function getMasterAuth(): string {
  if (!TWILIO_MASTER_ACCOUNT_SID || !TWILIO_MASTER_AUTH_TOKEN) {
    throw new Error(
      'Twilio master credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
    )
  }
  return `Basic ${Buffer.from(`${TWILIO_MASTER_ACCOUNT_SID}:${TWILIO_MASTER_AUTH_TOKEN}`).toString('base64')}`
}

function subaccountAuth(sid: string, token: string): string {
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
}

async function requirePaymentMethod(organizationId: string): Promise<void> {
  const subscription =
    await subscriptionRepo.getSubscriptionByReferenceId(organizationId)
  if (!subscription || !subscription.stripeCustomerId) {
    throw new Error(
      'No active subscription found. Please subscribe to provision a phone number.',
    )
  }

  const paymentMethods = await stripeClient.paymentMethods.list({
    customer: subscription.stripeCustomerId,
    limit: 1,
  })

  if (paymentMethods.data.length === 0) {
    throw new Error(
      'A payment method is required before provisioning a phone number. Please add a credit card in your billing settings.',
    )
  }
}

// === Public API ===

export const getProvisioningStatus = async (organizationId: string) => {
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (!record) return null

  return {
    id: record.id,
    organizationId: record.organizationId,
    phoneNumber: record.phoneNumber,
    numberType: record.numberType,
    provisioningStatus: record.provisioningStatus,
    callerIdVerified: record.callerIdVerified,
    usesMainAccount: record.usesMainAccount || false,
    hasInfrastructure: !!(
      record.twilioSubaccountSid &&
      record.apiKeySid &&
      record.twimlAppSid
    ),
    provisionedAt: record.provisionedAt
      ? new Date(record.provisionedAt).toISOString()
      : null,
  }
}

/**
 * Sets up Twilio subaccount infrastructure (subaccount, API key, TwiML app)
 * without purchasing a phone number. Sets status to 'awaiting_number'.
 */
export const setupSubaccountInfrastructure = async (organizationId: string) => {
  await requirePaymentMethod(organizationId)

  const existing =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)

  // If infrastructure already exists, return current status
  if (
    existing &&
    existing.twilioSubaccountSid &&
    existing.apiKeySid &&
    existing.twimlAppSid
  ) {
    return getProvisioningStatus(organizationId)
  }

  // If already has an active number, skip
  if (
    existing &&
    existing.provisioningStatus === 'active' &&
    existing.phoneNumber
  ) {
    return getProvisioningStatus(organizationId)
  }

  let record = existing
  if (!record) {
    record = await phoneProvisioningRepo.create({
      organizationId,
      provisioningStatus: 'setup_pending',
      numberType: 'trial',
    })
  } else {
    await phoneProvisioningRepo.update(organizationId, {
      provisioningStatus: 'setup_pending',
    })
  }

  try {
    // 1. Create Twilio subaccount
    logger.info('Infrastructure step 1/3: Creating Twilio subaccount', {
      organizationId,
    })
    const subaccount = await createTwilioSubaccount(organizationId)

    // 2. Create API Key in subaccount
    logger.info('Infrastructure step 2/3: Creating API key', {
      organizationId,
    })
    const apiKey = await createApiKey(subaccount.sid, subaccount.authToken)

    // 3. Create TwiML App in subaccount
    const backendUrl = config.backendUrl
    logger.info('Infrastructure step 3/3: Creating TwiML app', {
      organizationId,
    })
    const twimlApp = await createTwimlApp(
      subaccount.sid,
      subaccount.authToken,
      `${backendUrl}/api/webhooks/twilio/voice`,
      `${backendUrl}/api/webhooks/twilio/voice-status`,
    )

    // Store infrastructure in PhoneProvisioning table
    await phoneProvisioningRepo.update(organizationId, {
      twilioSubaccountSid: subaccount.sid,
      twilioAuthTokenEncrypted: encrypt(subaccount.authToken),
      apiKeySid: apiKey.sid,
      apiKeySecretEncrypted: encrypt(apiKey.secret),
      twimlAppSid: twimlApp.sid,
      provisioningStatus: 'awaiting_number',
    })

    logger.info('Subaccount infrastructure setup complete', {
      organizationId,
      subaccountSid: subaccount.sid,
    })
    return getProvisioningStatus(organizationId)
  } catch (error) {
    logger.error('Failed to setup subaccount infrastructure', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    await phoneProvisioningRepo.update(organizationId, {
      provisioningStatus: 'failed',
    })
    throw error
  }
}

/**
 * Provisions a user-selected phone number into an existing subaccount.
 * Requires infrastructure to already be set up.
 */
export const provisionSelectedNumber = async (
  organizationId: string,
  phoneNumber: string,
) => {
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (!record) {
    throw new Error('No phone provisioning record found.')
  }

  if (!record.twilioSubaccountSid || !record.twilioAuthTokenEncrypted) {
    throw new Error('Subaccount infrastructure not set up yet.')
  }

  if (!record.twimlAppSid) {
    throw new Error('TwiML app not configured yet.')
  }

  await requirePaymentMethod(organizationId)

  const subaccountSid = record.twilioSubaccountSid
  const subaccountAuthToken = decrypt(record.twilioAuthTokenEncrypted)

  try {
    await phoneProvisioningRepo.update(organizationId, {
      provisioningStatus: 'provisioning',
    })

    // Release existing number if one exists
    if (record.phoneNumberSid) {
      await releaseNumber(
        subaccountSid,
        subaccountAuthToken,
        record.phoneNumberSid,
      )
    }

    // Purchase the selected number
    const purchased = await purchaseSpecificNumber(
      subaccountSid,
      subaccountAuthToken,
      phoneNumber,
    )

    // Configure number with TwiML app + SMS webhooks
    const backendUrl = config.backendUrl
    await configureNumberTwimlApp(
      subaccountSid,
      subaccountAuthToken,
      purchased.sid,
      record.twimlAppSid,
      `${backendUrl}/api/webhooks/twilio/sms/inbound`,
      `${backendUrl}/api/webhooks/twilio/sms/status`,
    )

    // Update PhoneProvisioning record
    await phoneProvisioningRepo.update(organizationId, {
      phoneNumber: purchased.phoneNumber,
      phoneNumberSid: purchased.sid,
      numberType: 'dedicated',
      provisioningStatus: 'active',
      callerIdVerified: false,
      provisionedAt: new Date(),
    })

    // Sync TwilioConfig so dialer works
    await ensureTwilioConfig(
      organizationId,
      subaccountSid,
      subaccountAuthToken,
      purchased.phoneNumber,
    )

    logger.info('Phone number provisioned', {
      organizationId,
      phoneNumber: purchased.phoneNumber,
    })

    return getProvisioningStatus(organizationId)
  } catch (error) {
    logger.error('Failed to provision selected number', {
      organizationId,
      phoneNumber,
      error: error instanceof Error ? error.message : String(error),
    })
    await phoneProvisioningRepo.update(organizationId, {
      provisioningStatus: 'failed',
    })
    throw error
  }
}

/**
 * Quick-setup: searches for a random available number and provisions it.
 * Sets up infrastructure if it doesn't exist yet.
 */
export const provisionQuickNumber = async (organizationId: string) => {
  await requirePaymentMethod(organizationId)

  // Ensure infrastructure exists
  const existing =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (
    !existing ||
    !existing.twilioSubaccountSid ||
    !existing.apiKeySid ||
    !existing.twimlAppSid
  ) {
    await setupSubaccountInfrastructure(organizationId)
  }

  // Search for an available number
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (
    !record ||
    !record.twilioSubaccountSid ||
    !record.twilioAuthTokenEncrypted
  ) {
    throw new Error('Failed to setup infrastructure for quick provisioning')
  }

  const subaccountAuthToken = decrypt(record.twilioAuthTokenEncrypted)
  const searchResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${record.twilioSubaccountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${SHARED_TRIAL_AREA_CODE}&VoiceEnabled=true&Limit=1`,
    {
      headers: {
        Authorization: subaccountAuth(
          record.twilioSubaccountSid,
          subaccountAuthToken,
        ),
      },
    },
  )

  if (!searchResponse.ok) {
    throw new Error('No phone numbers available for quick setup')
  }

  const searchData = await searchResponse.json()
  const available = searchData.available_phone_numbers
  if (!available || available.length === 0) {
    throw new Error('No phone numbers available for quick setup')
  }

  return provisionSelectedNumber(organizationId, available[0].phone_number)
}

export const searchAvailableNumbers = async (areaCode: string) => {
  if (!TWILIO_MASTER_ACCOUNT_SID || !TWILIO_MASTER_AUTH_TOKEN) {
    throw new Error('Twilio master credentials not configured')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_MASTER_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&VoiceEnabled=true&Limit=20`,
    {
      headers: { Authorization: getMasterAuth() },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to search available numbers')
  }

  const data = await response.json()
  const numbers = data.available_phone_numbers || []

  return numbers.map((n: any) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    locality: n.locality || '',
    region: n.region || '',
    isoCountry: n.iso_country || 'US',
  }))
}

export const verifyCallerId = async (organizationId: string) => {
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (!record || !record.phoneNumber) {
    throw new Error('No phone number provisioned')
  }

  if (!record.twilioSubaccountSid || !record.twilioAuthTokenEncrypted) {
    throw new Error('Subaccount not provisioned')
  }

  const subaccountSid = record.twilioSubaccountSid
  const subaccountAuthToken = decrypt(record.twilioAuthTokenEncrypted)

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/OutgoingCallerIds.json`,
    {
      method: 'POST',
      headers: {
        Authorization: subaccountAuth(subaccountSid, subaccountAuthToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: record.phoneNumber,
        FriendlyName: `RevCenter - ${organizationId.slice(0, 8)}`,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to initiate caller ID verification: ${error}`)
  }

  const data = await response.json()
  return {
    validationCode: data.validation_code,
    callSid: data.call_sid,
  }
}

export const checkCallerIdVerification = async (organizationId: string) => {
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (!record || !record.phoneNumber) {
    return { callerIdVerified: false }
  }

  if (!record.twilioSubaccountSid || !record.twilioAuthTokenEncrypted) {
    return { callerIdVerified: false }
  }

  const subaccountSid = record.twilioSubaccountSid
  const subaccountAuthToken = decrypt(record.twilioAuthTokenEncrypted)

  // Check if the number appears in verified caller IDs
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/OutgoingCallerIds.json?PhoneNumber=${encodeURIComponent(record.phoneNumber)}`,
    {
      headers: {
        Authorization: subaccountAuth(subaccountSid, subaccountAuthToken),
      },
    },
  )

  if (!response.ok) {
    return { callerIdVerified: false }
  }

  const data = await response.json()
  const verified =
    data.outgoing_caller_ids && data.outgoing_caller_ids.length > 0

  if (verified && !record.callerIdVerified) {
    await phoneProvisioningRepo.update(organizationId, {
      callerIdVerified: true,
    })
  }

  return { callerIdVerified: verified }
}

// === Admin ===

export const getAllProvisioningRecords = async () => {
  return phoneProvisioningRepo.findAllWithOrganizations()
}

export const adminReleaseNumber = async (organizationId: string) => {
  const record =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)
  if (!record) {
    throw new Error('No phone provisioning record found for this organization.')
  }

  if (record.usesMainAccount) {
    throw new Error('Cannot release a number for a main account organization.')
  }

  if (!record.phoneNumber) {
    throw new Error('No phone number to release.')
  }

  if (!record.twilioSubaccountSid || !record.twilioAuthTokenEncrypted) {
    throw new Error(
      'Missing subaccount credentials — cannot release number from Twilio.',
    )
  }

  // Release the number from Twilio
  const subaccountAuthToken = decrypt(record.twilioAuthTokenEncrypted)
  if (record.phoneNumberSid) {
    await releaseNumber(
      record.twilioSubaccountSid,
      subaccountAuthToken,
      record.phoneNumberSid,
    )
  }

  // Null out phone-specific fields, keep infrastructure intact
  await phoneProvisioningRepo.update(organizationId, {
    phoneNumber: null,
    phoneNumberSid: null,
    provisionedAt: null,
    callerIdVerified: false,
    provisioningStatus: 'awaiting_number',
  })

  // Delete TwilioConfig so the dialer doesn't try to use a stale number
  await twilioConfigRepo.deleteByOrganizationId(organizationId)

  logger.info('Admin released phone number', {
    organizationId,
    releasedNumber: record.phoneNumber,
  })

  return { success: true }
}

export const markAsMainAccount = async (organizationId: string) => {
  if (!TWILIO_MASTER_ACCOUNT_SID || !TWILIO_MASTER_AUTH_TOKEN) {
    throw new Error('Master Twilio credentials not configured')
  }

  // Fetch all phone numbers from the master Twilio account
  const phoneNumbers = await fetchAccountPhoneNumbers(
    TWILIO_MASTER_ACCOUNT_SID,
    TWILIO_MASTER_AUTH_TOKEN,
  )

  const primaryNumber = phoneNumbers[0] ?? undefined

  const existing =
    await phoneProvisioningRepo.findByOrganizationId(organizationId)

  if (existing) {
    await phoneProvisioningRepo.update(organizationId, {
      usesMainAccount: true,
      provisioningStatus: 'active',
      phoneNumber: primaryNumber,
    })
  } else {
    await phoneProvisioningRepo.create({
      organizationId,
      usesMainAccount: true,
      provisioningStatus: 'active',
      numberType: 'main',
      phoneNumber: primaryNumber,
    })
  }

  // Ensure TwilioConfig exists so the dialer can generate capability tokens
  const existingConfig =
    await twilioConfigRepo.findByOrganizationId(organizationId)
  if (existingConfig) {
    await twilioConfigRepo.update(organizationId, {
      accountSid: TWILIO_MASTER_ACCOUNT_SID,
      authTokenEncrypted: encrypt(TWILIO_MASTER_AUTH_TOKEN),
      phoneNumbers,
    })
  } else {
    await twilioConfigRepo.create({
      organizationId,
      accountSid: TWILIO_MASTER_ACCOUNT_SID,
      authTokenEncrypted: encrypt(TWILIO_MASTER_AUTH_TOKEN),
      phoneNumbers,
    })
  }

  logger.info('Marked org as main account', {
    organizationId,
    phoneNumberCount: phoneNumbers.length,
    phoneNumbers,
  })

  return { success: true }
}

// === Twilio API Helpers ===

async function fetchAccountPhoneNumbers(
  accountSid: string,
  authToken: string,
): Promise<string[]> {
  const numbers: string[] = []
  let url: string | null =
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`

  const auth = subaccountAuth(accountSid, authToken)

  while (url) {
    const response: Response = await fetch(url, {
      headers: { Authorization: auth },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch phone numbers: ${error}`)
    }

    const data: any = await response.json()
    for (const num of data.incoming_phone_numbers || []) {
      numbers.push(num.phone_number)
    }

    // Follow pagination
    url = data.next_page_uri
      ? `https://api.twilio.com${data.next_page_uri}`
      : null
  }

  return numbers
}

async function createTwilioSubaccount(
  organizationId: string,
): Promise<{ sid: string; authToken: string }> {
  const response = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts.json',
    {
      method: 'POST',
      headers: {
        Authorization: getMasterAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        FriendlyName: `RevCenter Dialer - ${organizationId.slice(0, 8)}`,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Twilio subaccount: ${error}`)
  }

  const data = await response.json()
  return { sid: data.sid, authToken: data.auth_token }
}

async function createApiKey(
  accountSid: string,
  authToken: string,
): Promise<{ sid: string; secret: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Keys.json`,
    {
      method: 'POST',
      headers: {
        Authorization: subaccountAuth(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        FriendlyName: 'RevCenter Dialer API Key',
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create API key: ${error}`)
  }

  const data = await response.json()
  return { sid: data.sid, secret: data.secret }
}

async function createTwimlApp(
  accountSid: string,
  authToken: string,
  voiceUrl: string,
  statusCallbackUrl: string,
): Promise<{ sid: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications.json`,
    {
      method: 'POST',
      headers: {
        Authorization: subaccountAuth(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        FriendlyName: 'RevCenter Dialer',
        VoiceUrl: voiceUrl,
        VoiceMethod: 'POST',
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: 'POST',
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create TwiML app: ${error}`)
  }

  const data = await response.json()
  return { sid: data.sid }
}

async function purchaseNumber(
  accountSid: string,
  authToken: string,
  areaCode: string,
): Promise<{ phoneNumber: string; sid: string }> {
  // Search for available numbers
  const searchResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&VoiceEnabled=true&Limit=1`,
    {
      headers: { Authorization: subaccountAuth(accountSid, authToken) },
    },
  )

  if (!searchResponse.ok) {
    throw new Error('No phone numbers available in the requested area code')
  }

  const searchData = await searchResponse.json()
  const available = searchData.available_phone_numbers
  if (!available || available.length === 0) {
    throw new Error('No phone numbers available in the requested area code')
  }

  return purchaseSpecificNumber(
    accountSid,
    authToken,
    available[0].phone_number,
  )
}

async function purchaseSpecificNumber(
  accountSid: string,
  authToken: string,
  phoneNumber: string,
): Promise<{ phoneNumber: string; sid: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: subaccountAuth(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to purchase phone number: ${error}`)
  }

  const data = await response.json()
  return { phoneNumber: data.phone_number, sid: data.sid }
}

async function configureNumberTwimlApp(
  accountSid: string,
  authToken: string,
  phoneNumberSid: string,
  twimlAppSid: string,
  smsUrl?: string,
  smsStatusCallbackUrl?: string,
): Promise<void> {
  const params: Record<string, string> = {
    VoiceApplicationSid: twimlAppSid,
  }
  if (smsUrl) {
    params.SmsUrl = smsUrl
    params.SmsMethod = 'POST'
  }
  if (smsStatusCallbackUrl) {
    params.StatusCallback = smsStatusCallbackUrl
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: 'POST',
      headers: {
        Authorization: subaccountAuth(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to configure number TwiML app: ${error}`)
  }
}

async function releaseNumber(
  accountSid: string,
  authToken: string,
  phoneNumberSid: string,
): Promise<void> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: 'DELETE',
      headers: {
        Authorization: subaccountAuth(accountSid, authToken),
      },
    },
  )

  if (!response.ok) {
    console.warn(
      `Failed to release phone number ${phoneNumberSid}:`,
      await response.text(),
    )
  }
}

async function ensureTwilioConfig(
  organizationId: string,
  accountSid: string,
  authToken: string,
  phoneNumber: string,
) {
  const existing = await twilioConfigRepo.findByOrganizationId(organizationId)
  if (existing) {
    await twilioConfigRepo.update(organizationId, {
      accountSid,
      authTokenEncrypted: encrypt(authToken),
      phoneNumbers: [phoneNumber],
    })
  } else {
    await twilioConfigRepo.create({
      organizationId,
      accountSid,
      authTokenEncrypted: encrypt(authToken),
      phoneNumbers: [phoneNumber],
    })
  }
}
