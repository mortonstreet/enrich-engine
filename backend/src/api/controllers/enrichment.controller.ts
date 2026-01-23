import { AuthRequestHandler, ValidatedRequestHandler } from "@/types/handlers";
import * as enrichmentService from "@/services/enrichment.service";
import {
  EnrichPersonRequest,
  GetEnrichmentHistoryRequest,
  GetBulkJobRequest,
  BulkEnrichRequest,
  BulkJobType,
} from "@shared/types/src";
import { addBulkEnrichmentJob } from "@/queues/enrichment.queue";

// Helper to parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

export const enrichPerson: AuthRequestHandler<EnrichPersonRequest> = async (
  req,
  res,
) => {
  const { linkedinUrl, enrichMobile } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await enrichmentService.enrichPerson(
    organizationId,
    req.user.id,
    { linkedinUrl, enrichMobile },
  );

  res.json(result);
};

export const getEnrichmentHistory: AuthRequestHandler<
  GetEnrichmentHistoryRequest
> = async (req, res) => {
  const { page, limit, status } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await enrichmentService.getEnrichmentHistory(organizationId, {
    page,
    limit,
    status,
  });

  res.json(result);
};

export const createBulkJob: AuthRequestHandler<BulkEnrichRequest> = async (
  req,
  res,
) => {
  const { enrichMobile } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  // Get file from multipart form data
  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Parse CSV file
  const csvContent = file.buffer.toString("utf-8");
  const lines = csvContent.split("\n").filter((line: string) => line.trim());

  if (lines.length < 2) {
    return res
      .status(400)
      .json({ error: "CSV file must have at least one data row" });
  }

  // Parse header
  const headerCols = parseCSVLine(lines[0]).map((col) => col.toLowerCase());

  // Detect CSV type by checking for column names
  const linkedinUrlIndex = headerCols.findIndex(
    (col) => col.includes("linkedin") || col === "url",
  );
  const companyIndex = headerCols.findIndex(
    (col) => col === "company" || col === "company_name" || col === "companyname",
  );
  const domainIndex = headerCols.findIndex(
    (col) => col === "domain" || col === "company_domain" || col === "website",
  );
  const role1Index = headerCols.findIndex(
    (col) => col === "role" || col === "role1" || col === "title",
  );
  const role2Index = headerCols.findIndex((col) => col === "role2");
  const identifierIndex = headerCols.findIndex(
    (col) => col.includes("id") || col.includes("identifier"),
  );

  // Determine job type
  const hasLinkedinColumn = linkedinUrlIndex !== -1;
  const hasPeopleSearchColumns = (companyIndex !== -1 || domainIndex !== -1) && role1Index !== -1;

  if (!hasLinkedinColumn && !hasPeopleSearchColumns) {
    return res.status(400).json({
      error:
        'CSV must contain either a "linkedin/url" column OR "company/domain" + "role/role1" columns',
    });
  }

  // Prefer LinkedIn if both are present
  const jobType = hasLinkedinColumn ? BulkJobType.LINKEDIN : BulkJobType.PEOPLE_SEARCH;

  if (jobType === BulkJobType.LINKEDIN) {
    // Parse LinkedIn URLs
    const linkedinUrls = lines
      .slice(1)
      .map((line: string, index: number) => {
        const cols = parseCSVLine(line);
        return {
          identifier:
            identifierIndex !== -1 ? cols[identifierIndex] : `row-${index + 1}`,
          linkedinUrl: cols[linkedinUrlIndex],
        };
      })
      .filter((item) => item.linkedinUrl);

    if (linkedinUrls.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid LinkedIn URLs found in CSV" });
    }

    const result = await enrichmentService.createBulkJob(
      organizationId,
      req.user.id,
      file.originalname,
      linkedinUrls,
      enrichMobile,
      BulkJobType.LINKEDIN,
    );

    await addBulkEnrichmentJob(result.job.id);
    res.json(result);
  } else {
    // Parse company/domain/role data
    const peopleSearchItems = lines
      .slice(1)
      .map((line: string, index: number) => {
        const cols = parseCSVLine(line);
        const roles: string[] = [];

        if (role1Index !== -1 && cols[role1Index]) {
          roles.push(cols[role1Index]);
        }
        if (role2Index !== -1 && cols[role2Index]) {
          roles.push(cols[role2Index]);
        }

        return {
          identifier:
            identifierIndex !== -1 && cols[identifierIndex]
              ? cols[identifierIndex]
              : `row-${index + 1}`,
          company: companyIndex !== -1 ? cols[companyIndex] : undefined,
          domain: domainIndex !== -1 ? cols[domainIndex] : undefined,
          roles,
        };
      })
      .filter((item) => (item.company || item.domain) && item.roles.length > 0);

    if (peopleSearchItems.length === 0) {
      return res.status(400).json({
        error: "No valid company/domain + role combinations found in CSV",
      });
    }

    const result = await enrichmentService.createPeopleSearchBulkJob(
      organizationId,
      req.user.id,
      file.originalname,
      peopleSearchItems,
      enrichMobile,
    );

    await addBulkEnrichmentJob(result.job.id);
    res.json(result);
  }
};

export const getBulkJobStatus: AuthRequestHandler<GetBulkJobRequest> = async (
  req,
  res,
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await enrichmentService.getBulkJobStatus(
    jobId,
    organizationId,
  );

  res.json(result);
};

export const downloadBulkJobCsv: AuthRequestHandler<GetBulkJobRequest> = async (
  req,
  res,
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await enrichmentService.getBulkJobStatus(
    jobId,
    organizationId,
  );

  // Generate CSV - include input fields for people_search jobs
  const isPeopleSearchJob = result.job.jobType === BulkJobType.PEOPLE_SEARCH;

  const headers = isPeopleSearchJob
    ? [
        "Identifier",
        "Input Company",
        "Input Domain",
        "Input Role",
        "LinkedIn URL",
        "Status",
        "Email",
        "Mobile",
        "First Name",
        "Last Name",
        "Title",
        "Company Name",
        "Error",
      ]
    : [
        "Identifier",
        "LinkedIn URL",
        "Status",
        "Email",
        "Mobile",
        "First Name",
        "Last Name",
        "Title",
        "Company Name",
        "Error",
      ];

  const rows = result.items.map((item) =>
    isPeopleSearchJob
      ? [
          item.identifier,
          item.inputCompany || "",
          item.inputDomain || "",
          item.inputRole || "",
          item.linkedinUrl || "",
          item.status,
          item.email || "",
          item.mobile || "",
          item.firstName || "",
          item.lastName || "",
          item.title || "",
          item.companyName || "",
          item.errorCode || "",
        ]
      : [
          item.identifier,
          item.linkedinUrl || "",
          item.status,
          item.email || "",
          item.mobile || "",
          item.firstName || "",
          item.lastName || "",
          item.title || "",
          item.companyName || "",
          item.errorCode || "",
        ],
  );

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="enrichment-results-${jobId}.csv"`,
  );
  res.send(csvContent);
};
