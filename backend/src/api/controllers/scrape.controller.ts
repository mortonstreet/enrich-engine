import { AuthRequestHandler } from "@/types/handlers";
import * as scrapeService from "@/services/scrape.service";
import { addScrapeJob } from "@/queues/scrape.queue";
import {
  CreateScrapeJobRequest,
  GetScrapeJobsRequest,
  GetScrapeJobRequest,
  DeleteScrapeJobRequest,
  PauseScrapeJobRequest,
  RenameScrapeJobRequest,
  SyncScrapeJobRequest,
  ScrapeInputType,
  ScrapeCSVRow,
} from "@shared/types/src";

function parseCSV(content: string): { headers: string[]; rows: ScrapeCSVRow[] } {
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 1) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const rows: ScrapeCSVRow[] = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: ScrapeCSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });

  return { headers, rows };
}

export const createScrapeJob: AuthRequestHandler<CreateScrapeJobRequest> = async (
  req,
  res
) => {
  const { name } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const csvContent = file.buffer.toString("utf-8");
  const { headers, rows } = parseCSV(csvContent);

  if (rows.length === 0) {
    return res.status(400).json({ error: "CSV file must have at least one data row" });
  }

  const validation = scrapeService.validateCSVColumns(headers);

  if (!validation.isValid || !validation.inputType) {
    return res.status(400).json({
      error: "Invalid CSV columns",
      details: validation.errors,
      missingColumns: validation.missingColumns,
    });
  }

  const jobName = name || `Scrape - ${new Date().toLocaleDateString()}`;

  const result = await scrapeService.createScrapeJob(
    organizationId,
    req.user.id,
    jobName,
    validation.inputType as ScrapeInputType,
    rows
  );

  await addScrapeJob(result.job.id);

  res.json(result);
};

export const getScrapeJobs: AuthRequestHandler<GetScrapeJobsRequest> = async (
  req,
  res
) => {
  const { page, limit, status } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await scrapeService.getScrapeJobs(organizationId, {
    page,
    limit,
    status,
  });

  res.json(result);
};

export const getScrapeJob: AuthRequestHandler<GetScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await scrapeService.getScrapeJob(jobId, organizationId);

  res.json(result);
};

export const deleteScrapeJob: AuthRequestHandler<DeleteScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await scrapeService.deleteScrapeJob(jobId, organizationId);

  res.json(result);
};

export const downloadScrapeResults: AuthRequestHandler<GetScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { fileName, rows } = await scrapeService.getDownloadData(
    jobId,
    organizationId
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: "No results to download" });
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(csvContent);
};

export const pauseScrapeJob: AuthRequestHandler<PauseScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const job = await scrapeService.pauseScrapeJob(jobId, organizationId);

  res.json(job);
};

export const resumeScrapeJob: AuthRequestHandler<PauseScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const job = await scrapeService.resumeScrapeJob(jobId, organizationId);

  // Re-add to the queue so it continues processing
  await addScrapeJob(jobId);

  res.json(job);
};

export const renameScrapeJob: AuthRequestHandler<RenameScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId, name } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const job = await scrapeService.renameScrapeJob(jobId, organizationId, name);

  res.json(job);
};

export const syncScrapeJob: AuthRequestHandler<SyncScrapeJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await scrapeService.syncScrapeJobToList(jobId, organizationId);

  res.json(result);
};
