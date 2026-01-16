import { config } from "@/config";
import logger from "@/lib/logger";

const PROSPEO_BASE_URL = "https://api.prospeo.io";

export interface ProspeoEnrichPersonRequest {
  linkedin_url: string;
  enrich_mobile?: boolean;
}

export interface ProspeoEnrichPersonResponse {
  success: boolean;
  message?: string;
  response?: {
    email?: {
      email: string;
      verified: boolean;
    };
    mobile?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    company_name?: string;
    company_domain?: string;
  };
  error?: string;
  error_code?: string;
  credits_used?: number;
}

export interface ProspeooBulkEnrichRequest {
  data: Array<{
    identifier: string;
    linkedin_url: string;
  }>;
  enrich_mobile?: boolean;
}

export interface ProspeooBulkEnrichResponse {
  success: boolean;
  message?: string;
  response?: Array<{
    identifier: string;
    email?: {
      email: string;
      verified: boolean;
    };
    mobile?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    company_name?: string;
    status: "success" | "not_found" | "error";
    error_code?: string;
  }>;
  error?: string;
  credits_used?: number;
}

async function prospeoFetch<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${PROSPEO_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KEY": config.prospeo.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Prospeo API error");
    throw new Error(`Prospeo API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function enrichPerson(
  linkedinUrl: string,
  enrichMobile: boolean = true,
): Promise<ProspeoEnrichPersonResponse> {
  logger.info({ linkedinUrl, enrichMobile }, "Enriching person via Prospeo");

  const response = await prospeoFetch<ProspeoEnrichPersonResponse>(
    "/linkedin-email-finder",
    {
      url: linkedinUrl,
      enrich_mobile: enrichMobile,
    },
  );

  logger.info(
    { linkedinUrl, success: response.success },
    "Prospeo enrichment complete",
  );

  return response;
}

export async function bulkEnrichPersons(
  data: ProspeooBulkEnrichRequest["data"],
  enrichMobile: boolean = true,
): Promise<ProspeooBulkEnrichResponse> {
  logger.info(
    { count: data.length, enrichMobile },
    "Bulk enriching persons via Prospeo",
  );

  const response = await prospeoFetch<ProspeooBulkEnrichResponse>(
    "/bulk-linkedin-email-finder",
    {
      data,
      enrich_mobile: enrichMobile,
    },
  );

  logger.info(
    { count: data.length, success: response.success },
    "Prospeo bulk enrichment complete",
  );

  return response;
}
