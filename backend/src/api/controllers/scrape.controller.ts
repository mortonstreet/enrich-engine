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

// Parse a CSV line, properly handling quoted fields with commas inside
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Don't forget the last value
  values.push(current.trim());

  return values;
}

function parseCSV(content: string): { headers: string[]; rows: ScrapeCSVRow[] } {
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 1) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^["']|["']$/g, ""));

  const rows: ScrapeCSVRow[] = lines.slice(1).map((line) => {
    const values = parseCSVLine(line).map((v) => v.replace(/^["']|["']$/g, ""));
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
  const { name, roleConfigs } = req.validated;
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

  // Pass roleConfigs to validation - if provided, allows company-only CSVs
  const validation = scrapeService.validateCSVColumns(headers, roleConfigs);

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
    rows,
    roleConfigs
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
  const foundOnly = req.query.foundOnly === "true";

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { fileName, rows } = await scrapeService.getDownloadData(
    jobId,
    organizationId,
    foundOnly
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

  // Update filename to indicate found only
  const finalFileName = foundOnly ? fileName.replace(".csv", "_found.csv") : fileName;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${finalFileName}"`);
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
