import logger from "@/lib/logger";

const REALTIME_API_URL = "https://api.millionverifier.com/api/v3/";

// ============================================
// Types
// ============================================

export interface RealtimeValidationResponse {
  email: string;
  quality: string;
  result: string;
  resultcode: number;
  subresult: string | null;
  free: boolean;
  role: boolean;
  didyoumean: string | null;
  credits: number;
  executiontime: number;
  error: string | null;
}

export type ValidationStatus = "valid" | "catch_all" | "unknown" | "bounced" | "error";

export interface ValidationResult {
  email: string;
  status: ValidationStatus;
  isRisky: boolean;
  isFree: boolean;
  isRole: boolean;
  creditsUsed: number;
  rawResponse: RealtimeValidationResponse;
}

// ============================================
// Single Email Validation
// ============================================

/**
 * Validates a single email address using MillionVerifier's realtime API.
 * This is more expensive than bulk but provides immediate results.
 *
 * @param email - Email address to validate
 * @param apiKey - MillionVerifier API key
 * @param timeout - Request timeout in ms (default: 30000)
 * @returns Validation result
 */
export async function validateEmailRealtime(
  email: string,
  apiKey: string,
  timeout: number = 30000
): Promise<ValidationResult> {
  const url = `${REALTIME_API_URL}?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=30`;

  logger.debug({ email }, "Validating email via realtime API");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ email, status: response.status, errorText }, "Realtime validation request failed");

      return {
        email,
        status: "error",
        isRisky: true,
        isFree: false,
        isRole: false,
        creditsUsed: 0,
        rawResponse: {
          email,
          quality: "error",
          result: "error",
          resultcode: response.status,
          subresult: null,
          free: false,
          role: false,
          didyoumean: null,
          credits: 0,
          executiontime: 0,
          error: errorText,
        },
      };
    }

    const result = (await response.json()) as RealtimeValidationResponse;

    logger.debug(
      { email, result: result.result, quality: result.quality },
      "Realtime validation result"
    );

    return {
      email,
      status: mapResultToStatus(result),
      isRisky: isRiskyResult(result),
      isFree: result.free,
      isRole: result.role,
      creditsUsed: result.credits,
      rawResponse: result,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logger.warn({ email, timeout }, "Realtime validation timed out");
      return {
        email,
        status: "unknown",
        isRisky: true,
        isFree: false,
        isRole: false,
        creditsUsed: 0,
        rawResponse: {
          email,
          quality: "timeout",
          result: "timeout",
          resultcode: 0,
          subresult: null,
          free: false,
          role: false,
          didyoumean: null,
          credits: 0,
          executiontime: timeout,
          error: "Request timed out",
        },
      };
    }

    logger.error({ email, error }, "Realtime validation error");
    throw error;
  }
}

/**
 * Maps the API result to our internal validation status
 */
function mapResultToStatus(result: RealtimeValidationResponse): ValidationStatus {
  const resultLower = result.result.toLowerCase();
  const qualityLower = result.quality.toLowerCase();

  // OK results
  if (resultLower === "ok" || qualityLower === "good") {
    return "valid";
  }

  // Catch-all domains accept any email
  if (resultLower === "catch_all") {
    return "catch_all";
  }

  // Invalid results
  if (
    resultLower === "invalid" ||
    resultLower === "disposable" ||
    qualityLower === "bad"
  ) {
    return "bounced";
  }

  // Unknown results
  if (resultLower === "unknown") {
    return "unknown";
  }

  // Default to unknown
  return "unknown";
}

/**
 * Checks if the result is considered risky for sending emails
 */
function isRiskyResult(result: RealtimeValidationResponse): boolean {
  const resultLower = result.result.toLowerCase();
  const qualityLower = result.quality.toLowerCase();

  // Risky results
  const riskyResults = ["invalid", "disposable", "unknown", "error", "timeout"];
  const riskyQualities = ["bad", "risky"];

  return (
    riskyResults.includes(resultLower) ||
    riskyQualities.includes(qualityLower)
  );
}

/**
 * Batch validation using realtime API (sequential with rate limiting).
 * Use this for small batches where you need immediate results.
 *
 * @param emails - Array of emails to validate
 * @param apiKey - MillionVerifier API key
 * @param concurrency - Number of concurrent requests (default: 3)
 * @param delayMs - Delay between requests in ms (default: 200)
 * @returns Array of validation results
 */
export async function validateEmailsBatchRealtime(
  emails: string[],
  apiKey: string,
  concurrency: number = 3,
  delayMs: number = 200
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const queue = [...emails];
  const inProgress: Promise<void>[] = [];

  logger.info(
    { emailCount: emails.length, concurrency, delayMs },
    "Starting batch realtime validation"
  );

  async function processEmail(email: string): Promise<void> {
    try {
      const result = await validateEmailRealtime(email, apiKey);
      results.push(result);
    } catch (error) {
      logger.error({ email, error }, "Batch validation error for email");
      results.push({
        email,
        status: "error",
        isRisky: true,
        isFree: false,
        isRole: false,
        creditsUsed: 0,
        rawResponse: {
          email,
          quality: "error",
          result: "error",
          resultcode: 0,
          subresult: null,
          free: false,
          role: false,
          didyoumean: null,
          credits: 0,
          executiontime: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (queue.length > 0 && inProgress.length < concurrency) {
      const email = queue.shift()!;
      const promise = processEmail(email).then(() => {
        const index = inProgress.indexOf(promise);
        if (index > -1) inProgress.splice(index, 1);
      });
      inProgress.push(promise);
    }

    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  logger.info(
    {
      emailCount: emails.length,
      validCount: results.filter((r) => r.status === "valid").length,
      catchAllCount: results.filter((r) => r.status === "catch_all").length,
    },
    "Batch realtime validation complete"
  );

  return results;
}
