import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "kysely";

async function main() {
  console.log("=== Debug Scrape Job and Lists ===\n");

  // Get all scrape jobs
  const jobs = await db
    .selectFrom("scrape_job")
    .selectAll()
    .orderBy("createdAt", "desc")
    .limit(5)
    .execute();

  console.log("Recent Scrape Jobs:");
  for (const job of jobs) {
    console.log(`  - ${job.name} (${job.id})`);
    console.log(`    Status: ${job.status}, Success: ${job.successCount}, Processed: ${job.processedRows}/${job.totalRows}`);
    console.log(`    ResultListId: ${job.resultListId || "NOT SET"}`);
  }

  if (jobs.length === 0) {
    console.log("No scrape jobs found.");
    process.exit(0);
  }

  const targetJob = jobs[0];
  console.log(`\n=== Analyzing job: ${targetJob.name} ===\n`);

  // Find all lists with this scrapeJobId
  const listsWithScrapeJobId = await db
    .selectFrom("lead_list")
    .where("scrapeJobId", "=", targetJob.id)
    .selectAll()
    .execute();

  console.log(`Lists with scrapeJobId=${targetJob.id}:`);
  if (listsWithScrapeJobId.length === 0) {
    console.log("  No lists found with this scrapeJobId");
  } else {
    for (const list of listsWithScrapeJobId) {
      const leadCount = await db
        .selectFrom("lead")
        .where("listId", "=", list.id)
        .select(sql<number>`count(*)::int`.as("count"))
        .executeTakeFirst();
      console.log(`  - ${list.name} (${list.id})`);
      console.log(`    Stored leadCount: ${list.leadCount}, Actual leads: ${leadCount?.count ?? 0}`);
    }
  }

  // Check if resultListId points to a valid list
  if (targetJob.resultListId) {
    const resultList = await db
      .selectFrom("lead_list")
      .where("id", "=", targetJob.resultListId)
      .selectAll()
      .executeTakeFirst();

    console.log(`\nResultListId check:`);
    if (resultList) {
      const leadCount = await db
        .selectFrom("lead")
        .where("listId", "=", resultList.id)
        .select(sql<number>`count(*)::int`.as("count"))
        .executeTakeFirst();
      console.log(`  Found: ${resultList.name} (${resultList.id}), Leads: ${leadCount?.count ?? 0}`);
    } else {
      console.log(`  WARNING: resultListId points to non-existent list!`);
    }
  }

  // Count successful items in the job
  const successfulItems = await db
    .selectFrom("scrape_job_item")
    .where("jobId", "=", targetJob.id)
    .where("status", "=", "completed")
    .where("linkedinUrl", "is not", null)
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  console.log(`\nSuccessful items with LinkedIn URLs: ${successfulItems?.count ?? 0}`);

  // Total leads in all lists for this job
  if (listsWithScrapeJobId.length > 0) {
    const totalLeads = await db
      .selectFrom("lead")
      .where("listId", "in", listsWithScrapeJobId.map(l => l.id))
      .select(sql<number>`count(*)::int`.as("count"))
      .executeTakeFirst();

    console.log(`Total leads across all lists for this job: ${totalLeads?.count ?? 0}`);
    console.log(`\nMISSING LEADS: ${(successfulItems?.count ?? 0) - (totalLeads?.count ?? 0)}`);
  }

  await db.destroy();
}

main().catch(console.error);
