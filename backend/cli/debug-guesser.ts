import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "kysely";

async function main() {
  console.log("=== Debug Email Guesser Data Requirements ===\n");

  // Get recent list enrichment jobs
  const jobs = await db
    .selectFrom("list_enrichment_job as job")
    .leftJoin("lead_list as list", "list.id", "job.listId")
    .select([
      "job.id",
      "job.listId",
      "job.enrichmentType",
      "job.enrichmentStrategy",
      "job.status",
      "job.totalRows",
      "job.processedRows",
      "job.successCount",
      "job.errorCount",
      "job.guessSuccessCount",
      "job.fallbackCount",
      "job.createdAt",
      "list.name as listName",
    ])
    .orderBy("job.createdAt", "desc")
    .limit(5)
    .execute();

  console.log("Recent Enrichment Jobs:");
  for (const job of jobs) {
    console.log(`\n  Job: ${job.id}`);
    console.log(`    List: ${job.listName} (${job.listId})`);
    console.log(`    Type: ${job.enrichmentType}, Strategy: ${job.enrichmentStrategy}`);
    console.log(`    Status: ${job.status}`);
    console.log(`    Progress: ${job.processedRows}/${job.totalRows}, Success: ${job.successCount}, Errors: ${job.errorCount}`);
    console.log(`    Guess Success: ${job.guessSuccessCount}, Fallback: ${job.fallbackCount}`);
  }

  if (jobs.length === 0) {
    console.log("No enrichment jobs found.");
    process.exit(0);
  }

  // Get the most recent job for detailed analysis
  const targetJob = jobs[0];
  console.log(`\n=== Analyzing job: ${targetJob.id} ===\n`);

  // Get job items with lead details
  const items = await db
    .selectFrom("list_enrichment_job_item as item")
    .leftJoin("lead", "lead.id", "item.leadId")
    .where("item.jobId", "=", targetJob.id)
    .select([
      "item.id",
      "item.leadId",
      "item.linkedinUrl",
      "item.status",
      "item.enrichedEmail",
      "item.errorMessage",
      "lead.firstName",
      "lead.lastName",
      "lead.company",
      "lead.companyDomain",
      "lead.linkedinUrl as leadLinkedinUrl",
    ])
    .execute();

  console.log("Job Items with Lead Data:");
  for (const item of items) {
    console.log(`\n  Item: ${item.id}`);
    console.log(`    Lead: ${item.leadId}`);
    console.log(`    Status: ${item.status}`);
    console.log(`    LinkedIn URL: ${item.linkedinUrl || item.leadLinkedinUrl || "NOT SET"}`);
    console.log(`    First Name: ${item.firstName || "MISSING"}`);
    console.log(`    Last Name: ${item.lastName || "MISSING"}`);
    console.log(`    Company: ${item.company || "NOT SET"}`);
    console.log(`    Company Domain: ${item.companyDomain || "NOT SET"}`);
    console.log(`    Enriched Email: ${item.enrichedEmail || "NOT FOUND"}`);
    if (item.errorMessage) {
      console.log(`    Error: ${item.errorMessage}`);
    }

    // Check if lead has data required for guessing
    const hasRequiredData = item.firstName && item.lastName && (item.companyDomain || item.company);
    console.log(`    Ready for Guessing: ${hasRequiredData ? "YES" : "NO - missing data"}`);
  }

  // Get validation attempts for this job
  const itemIds = items.map((i) => i.id);
  if (itemIds.length > 0) {
    const validationAttempts = await db
      .selectFrom("email_validation_attempt")
      .where("jobItemId", "in", itemIds)
      .select(["id", "jobItemId", "email", "pattern", "status", "createdAt"])
      .orderBy("createdAt", "asc")
      .execute();

    if (validationAttempts.length > 0) {
      console.log("\nEmail Validation Attempts:");
      for (const attempt of validationAttempts) {
        console.log(`  ${attempt.email} (${attempt.pattern}) -> ${attempt.status}`);
      }
    } else {
      console.log("\nNo validation attempts found - guessing may not have run");
    }
  }

  // Summary of data quality
  console.log("\n=== Data Quality Summary ===");
  const leadsWithNames = items.filter((i) => i.firstName && i.lastName).length;
  const leadsWithDomain = items.filter((i) => i.companyDomain).length;
  const leadsWithCompany = items.filter((i) => i.company).length;
  const leadsReadyForGuessing = items.filter(
    (i) => i.firstName && i.lastName && (i.companyDomain || i.company)
  ).length;

  console.log(`  Total leads: ${items.length}`);
  console.log(`  Leads with first+last name: ${leadsWithNames}`);
  console.log(`  Leads with company domain: ${leadsWithDomain}`);
  console.log(`  Leads with company name: ${leadsWithCompany}`);
  console.log(`  Leads ready for guessing: ${leadsReadyForGuessing}`);

  // Check the source list for more context
  if (targetJob.listId) {
    console.log(`\n=== Source List Analysis ===`);

    const list = await db
      .selectFrom("lead_list")
      .where("id", "=", targetJob.listId)
      .selectAll()
      .executeTakeFirst();

    if (list) {
      console.log(`  List: ${list.name}`);
      console.log(`  Source: ${list.source}`);
      console.log(`  Scrape Job ID: ${list.scrapeJobId || "NOT SCRAPED"}`);

      // If scraped, check the scrape job items for name data
      if (list.scrapeJobId) {
        const scrapeItems = await db
          .selectFrom("scrape_job_item")
          .where("jobId", "=", list.scrapeJobId)
          .where("status", "=", "completed")
          .select(["id", "inputData", "linkedinUrl"])
          .limit(5)
          .execute();

        console.log(`\n  Sample Scrape Items (showing inputData):`);
        for (const item of scrapeItems) {
          const inputData = item.inputData as Record<string, string>;
          console.log(`    LinkedIn: ${item.linkedinUrl}`);
          console.log(`    first_name: ${inputData?.first_name || "NOT SET"}`);
          console.log(`    last_name: ${inputData?.last_name || "NOT SET"}`);
          console.log(`    company: ${inputData?.company || "NOT SET"}`);
          console.log("");
        }
      }
    }
  }

  await db.destroy();
}

main().catch(console.error);
