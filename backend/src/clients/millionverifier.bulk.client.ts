import logger from "@/lib/logger";

const BULK_API_BASE_URL = "https://bulkapi.millionverifier.com/bulkapi/v2";

// ============================================
// Types
// ============================================

export interface BulkUploadResponse {
  file_id: string;
  error?: string;
}

export interface BulkFileStatus {
  file_id: string;
  status: "in_progress" | "finished" | "canceled";
  percent: number;
  total_rows?: number;
  verified?: number;
  ok?: number;
  catch_all?: number;
  unknown?: number;
  invalid?: number;
  error?: string;
}

export interface BulkValidationResult {
  email: string;
  quality: string;
  result: string;
  free: boolean;
  role: boolean;
}

export type BulkDownloadFilter = "ok" | "ok_and_catch_all" | "unknown" | "invalid" | "all";

// ============================================
// Bulk API Functions
// ============================================

/**
 * Uploads a list of emails to MillionVerifier bulk API for validation.
 * @param emails - Array of email addresses to validate
 * @param apiKey - MillionVerifier API key
 * @returns File ID for tracking the upload
 */
export async function uploadEmailsForBulkValidation(
  emails: string[],
  apiKey: string
): Promise<string> {
  logger.info({ emailCount: emails.length }, "Uploading emails to MillionVerifier bulk API");

  // Create CSV content - one email per line
  const csvContent = emails.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });

  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("file_contents", blob, "emails.csv");

  const response = await fetch(`${BULK_API_BASE_URL}/upload?remove_duplicates=0`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Bulk upload failed");
    throw new Error(`Bulk upload failed: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as BulkUploadResponse;

  if (result.error) {
    logger.error({ error: result.error }, "Bulk upload returned error");
    throw new Error(`Bulk upload error: ${result.error}`);
  }

  logger.info({ fileId: result.file_id, emailCount: emails.length }, "Bulk upload successful");
  return result.file_id;
}

/**
 * Gets the current status of a bulk validation job.
 * @param fileId - The file ID from upload
 * @param apiKey - MillionVerifier API key
 * @returns Current status of the validation job
 */
export async function getBulkValidationStatus(
  fileId: string,
  apiKey: string
): Promise<BulkFileStatus> {
  const url = `${BULK_API_BASE_URL}/fileinfo?key=${encodeURIComponent(apiKey)}&file_id=${encodeURIComponent(fileId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get bulk status: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as BulkFileStatus;
}

/**
 * Polls the bulk validation status until completion.
 * @param fileId - The file ID from upload
 * @param apiKey - MillionVerifier API key
 * @param onProgress - Optional callback for progress updates
 * @param pollIntervalMs - Polling interval in milliseconds (default: 2000)
 * @param maxWaitMs - Maximum wait time in milliseconds (default: 30 minutes)
 * @returns Final status when complete
 */
export async function waitForBulkValidationComplete(
  fileId: string,
  apiKey: string,
  onProgress?: (status: BulkFileStatus) => void,
  pollIntervalMs: number = 2000,
  maxWaitMs: number = 30 * 60 * 1000
): Promise<BulkFileStatus> {
  const startTime = Date.now();

  logger.info({ fileId, pollIntervalMs, maxWaitMs }, "Starting to poll bulk validation status");

  while (true) {
    const status = await getBulkValidationStatus(fileId, apiKey);

    if (onProgress) {
      onProgress(status);
    }

    logger.debug(
      { fileId, status: status.status, percent: status.percent },
      "Bulk validation progress"
    );

    if (status.status === "finished" || status.status === "canceled") {
      logger.info(
        { fileId, status: status.status, percent: status.percent },
        "Bulk validation complete"
      );
      return status;
    }

    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Bulk validation timed out after ${maxWaitMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/**
 * Downloads the results of a bulk validation job.
 * @param fileId - The file ID from upload
 * @param apiKey - MillionVerifier API key
 * @param filter - Filter for which results to download
 * @returns Raw CSV content
 */
export async function downloadBulkResults(
  fileId: string,
  apiKey: string,
  filter: BulkDownloadFilter = "all"
): Promise<string> {
  const url = `${BULK_API_BASE_URL}/download?key=${encodeURIComponent(apiKey)}&file_id=${encodeURIComponent(fileId)}&filter=${filter}`;

  logger.info({ fileId, filter }, "Downloading bulk validation results");

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Bulk validation file not found");
    }
    if (response.status === 403) {
      throw new Error("Invalid API key for bulk download");
    }
    const errorText = await response.text();
    throw new Error(`Failed to download bulk results: ${response.status} - ${errorText}`);
  }

  const csvContent = await response.text();
  logger.info({ fileId, contentLength: csvContent.length }, "Bulk results downloaded");

  return csvContent;
}

/**
 * Parses the CSV results from bulk validation into a map of email -> result.
 * CSV format: email,quality,result,free,role
 * @param csvContent - Raw CSV content from download
 * @returns Map of email addresses to their validation results
 */
export function parseBulkResults(csvContent: string): Map<string, BulkValidationResult> {
  const results = new Map<string, BulkValidationResult>();
  const lines = csvContent.trim().split("\n");

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle potential quoted values)
    const parts = parseCSVLine(line);
    if (parts.length >= 3) {
      const [email, quality, result, freeStr, roleStr] = parts;
      results.set(email.toLowerCase(), {
        email: email.toLowerCase(),
        quality: quality || "",
        result: result || "",
        free: freeStr === "true" || freeStr === "1",
        role: roleStr === "true" || roleStr === "1",
      });
    }
  }

  logger.info({ resultCount: results.size }, "Parsed bulk validation results");
  return results;
}

/**
 * Helper to parse a CSV line handling quoted values.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Maps bulk API result to internal validation status.
 * @param result - The bulk validation result
 * @returns Internal status: valid, bounced, catch_all, or unknown
 */
export function mapBulkResultToStatus(
  result: BulkValidationResult
): "valid" | "bounced" | "catch_all" | "unknown" {
  const resultLower = result.result.toLowerCase();
  const qualityLower = result.quality.toLowerCase();

  if (resultLower === "ok" || qualityLower === "good") {
    return "valid";
  }

  if (resultLower === "catch_all") {
    return "catch_all";
  }

  if (resultLower === "invalid" || qualityLower === "bad" || resultLower === "disposable") {
    return "bounced";
  }

  return "unknown";
}

/**
 * Complete bulk validation flow: upload, wait, download, parse.
 * @param emails - Array of email addresses to validate
 * @param apiKey - MillionVerifier API key
 * @param onProgress - Optional callback for progress updates
 * @returns Map of email addresses to their validation results
 */
export async function validateEmailsBulk(
  emails: string[],
  apiKey: string,
  onProgress?: (status: BulkFileStatus) => void
): Promise<Map<string, BulkValidationResult>> {
  if (emails.length === 0) {
    return new Map();
  }

  // Upload
  const fileId = await uploadEmailsForBulkValidation(emails, apiKey);

  // Wait for completion
  await waitForBulkValidationComplete(fileId, apiKey, onProgress);

  // Download all results
  const csvContent = await downloadBulkResults(fileId, apiKey, "all");

  // Parse and return
  return parseBulkResults(csvContent);
}
