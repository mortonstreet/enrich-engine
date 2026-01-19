import logger from "@/lib/logger";

const MILLIONVERIFIER_BASE_URL = "https://api.millionverifier.com/api/v3";

/**
 * MillionVerifier Result Codes:
 * 1 = Valid email address
 * 2 = Catch-all domain
 * 3 = Unable to determine (unknown)
 * 4 = Connection error
 * 5 = Disposable email address
 * 6 = Invalid email format
 */
export type MillionVerifierResultCode = 1 | 2 | 3 | 4 | 5 | 6;

export interface MillionVerifierValidationResponse {
  email: string;
  result: string; // "ok", "catch_all", "unknown", "error", "disposable", "invalid"
  resultcode: MillionVerifierResultCode;
  free: boolean;
  role: boolean;
  didyoumean?: string;
  credits: number;
  error?: string;
  livemode: boolean;
}

export interface MillionVerifierCreditsResponse {
  credits: number;
}

export interface MillionVerifierBulkResult {
  email: string;
  result: string;
  resultcode: MillionVerifierResultCode;
}

/**
 * Validates a single email address using MillionVerifier Real-Time API.
 */
export async function validateEmail(
  email: string,
  apiKey: string,
  timeout: number = 10
): Promise<MillionVerifierValidationResponse> {
  logger.info({ email }, "Validating email via MillionVerifier");

  const url = new URL(MILLIONVERIFIER_BASE_URL);
  url.searchParams.set("api", apiKey);
  url.searchParams.set("email", email);
  url.searchParams.set("timeout", timeout.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, errorText },
      "MillionVerifier API error"
    );
    throw new Error(`MillionVerifier API error: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as MillionVerifierValidationResponse;

  logger.info(
    { email, result: result.result, resultcode: result.resultcode },
    "MillionVerifier validation complete"
  );

  return result;
}

/**
 * Validates multiple emails in sequence (MillionVerifier doesn't have a native bulk single-call API for real-time).
 * For large batches, consider using their file upload API instead.
 */
export async function validateEmailsBatch(
  emails: string[],
  apiKey: string,
  delayMs: number = 100
): Promise<MillionVerifierBulkResult[]> {
  logger.info({ count: emails.length }, "Batch validating emails via MillionVerifier");

  const results: MillionVerifierBulkResult[] = [];

  for (const email of emails) {
    try {
      const response = await validateEmail(email, apiKey);
      results.push({
        email: response.email,
        result: response.result,
        resultcode: response.resultcode,
      });

      // Rate limiting between requests
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      logger.error({ email, error }, "Failed to validate email in batch");
      results.push({
        email,
        result: "error",
        resultcode: 4, // Connection error
      });
    }
  }

  const valid = results.filter((r) => r.resultcode === 1).length;
  const invalid = results.filter((r) => r.resultcode === 6).length;

  logger.info(
    { count: emails.length, valid, invalid },
    "MillionVerifier batch validation complete"
  );

  return results;
}

/**
 * Maps MillionVerifier result code to our internal email validation status.
 */
export function mapMillionVerifierStatus(
  response: MillionVerifierValidationResponse
): "valid" | "bounced" | "catch_all" | "unknown" {
  switch (response.resultcode) {
    case 1: // Valid email
      return "valid";
    case 2: // Catch-all domain
      return "catch_all";
    case 3: // Unable to determine
    case 4: // Connection error
      return "unknown";
    case 5: // Disposable email - treat as bounced (not deliverable for business)
    case 6: // Invalid email format
      return "bounced";
    default:
      return "unknown";
  }
}

/**
 * Gets the current credit balance.
 */
export async function getCredits(apiKey: string): Promise<number> {
  const url = `${MILLIONVERIFIER_BASE_URL}/credits?api=${apiKey}`;

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
