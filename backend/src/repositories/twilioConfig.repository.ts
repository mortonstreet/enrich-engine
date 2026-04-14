import { db } from '@/lib/db'
import { withIdAndTimestamps, withTimestamps } from './utils'

export interface CreateTwilioConfigInput {
  organizationId: string
  accountSid: string
  authTokenEncrypted: string
  phoneNumbers?: string[]
}

export interface UpdateTwilioConfigInput {
  accountSid?: string
  authTokenEncrypted?: string
  phoneNumbers?: string[]
}

export const findByOrganizationId = async (organizationId: string) => {
  return db
    .selectFrom('twilio_config')
    .where('organizationId', '=', organizationId)
    .selectAll()
    .executeTakeFirst()
}

export const findById = async (id: string) => {
  return db
    .selectFrom('twilio_config')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export const create = async (data: CreateTwilioConfigInput) => {
  const record = withIdAndTimestamps(
    {
      ...data,
      phoneNumbers: data.phoneNumbers || [],
    },
    true,
  )

  return db
    .insertInto('twilio_config')
    .values(record)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const update = async (
  organizationId: string,
  data: UpdateTwilioConfigInput,
) => {
  const record = withTimestamps(data)

  return db
    .updateTable('twilio_config')
    .set(record)
    .where('organizationId', '=', organizationId)
    .returningAll()
    .executeTakeFirst()
}

export const deleteByOrganizationId = async (organizationId: string) => {
  return db
    .deleteFrom('twilio_config')
    .where('organizationId', '=', organizationId)
    .executeTakeFirst()
}

/**
 * Find a Twilio config by phone number
 * Used to route inbound calls to the correct organization
 */
export const findByPhoneNumber = async (phoneNumber: string) => {
  // Normalize phone number - strip formatting to match stored numbers
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '')

  // Query all configs and check if the phone number is in the array
  // PostgreSQL array contains operator: @>
  const configs = await db.selectFrom('twilio_config').selectAll().execute()

  // Find the config that contains this phone number
  for (const config of configs) {
    const storedNumbers = config.phoneNumbers || []
    for (const stored of storedNumbers) {
      const normalizedStored = stored.replace(/[^\d+]/g, '')
      // Check for exact match or match without country code
      if (
        normalizedStored === normalizedPhone ||
        normalizedStored.endsWith(normalizedPhone.slice(-10)) ||
        normalizedPhone.endsWith(normalizedStored.slice(-10))
      ) {
        return config
      }
    }
  }

  return null
}
