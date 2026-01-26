import logger from "@/lib/logger";

const MILLIONVERIFIER_BASE_URL = "https://api.millionverifier.com/api/v3/";

/**
 * MillionVerifier Real-Time API Client
 *
 * NOTE: For email validation, use the bulk API client instead:
 * @see millionverifier.bulk.client.ts
 *
 * This client is kept for utility functions (credits check, API key testing).
 */

export interface MillionVerifierCreditsResponse {
  credits: number;
}

/**
 * Gets the current credit balance.
 */
export async function getCredits(apiKey: string): Promise<number> {
  const url = `${MILLIONVERIFIER_BASE_URL}credits?api=${apiKey}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`MillionVerifier API error: ${response.status}`);
  }

  const result = (await response.json()) as MillionVerifierCreditsResponse;
  return result.credits;
}

/**
 * Tests if an API key is valid by checking credits.
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await getCredits(apiKey);
    return true;
  } catch (error) {
    logger.error({ error }, "MillionVerifier API key test failed");
    return false;
  }
}
