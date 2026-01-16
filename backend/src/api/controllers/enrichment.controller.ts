import { AuthRequestHandler, ValidatedRequestHandler } from "@/types/handlers";
import * as enrichmentService from "@/services/enrichment.service";
import {
  EnrichPersonRequest,
  GetEnrichmentHistoryRequest,
  GetBulkJobRequest,
  BulkEnrichRequest,
} from "@shared/types/src";
import { addBulkEnrichmentJob } from "@/queues/enrichment.queue";

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

  // Parse header and data rows
  const header = lines[0].toLowerCase();
  const linkedinUrlIndex = header
    .split(",")
    .findIndex(
      (col: string) =>
        col.trim().includes("linkedin") || col.trim().includes("url"),
    );
  const identifierIndex = header
    .split(",")
    .findIndex(
      (col: string) =>
        col.trim().includes("id") || col.trim().includes("identifier"),
    );

  if (linkedinUrlIndex === -1) {
    return res.status(400).json({
      error: 'CSV must contain a column with "linkedin" or "url" in the header',
    });
  }

  const linkedinUrls = lines
    .slice(1)
    .map((line: string, index: number) => {
      const cols = line.split(",").map((col: string) => col.trim());
      return {
        identifier:
          identifierIndex !== -1 ? cols[identifierIndex] : `row-${index + 1}`,
        linkedinUrl: cols[linkedinUrlIndex],
      };
    })
    .filter((item: { linkedinUrl: string }) => item.linkedinUrl);

  if (linkedinUrls.length === 0) {
    return res
      .status(400)
      .json({ error: "No valid LinkedIn URLs found in CSV" });
  }

  // Create job
  const result = await enrichmentService.createBulkJob(
    organizationId,
    req.user.id,
    file.originalname,
    linkedinUrls,
    enrichMobile,
  );

  // Queue for background processing
  await addBulkEnrichmentJob(result.job.id);

  res.json(result);
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

  // Generate CSV
  const headers = [
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

  const rows = result.items.map((item) => [
    item.identifier,
    item.linkedinUrl,
    item.status,
    item.email || "",
    item.mobile || "",
    item.firstName || "",
    item.lastName || "",
    item.title || "",
    item.companyName || "",
    item.errorCode || "",
  ]);

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
