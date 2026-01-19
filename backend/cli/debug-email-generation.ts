import "dotenv/config";
import { db } from "../src/lib/db";
import { generateEmailCandidates } from "../src/utils/emailPatternGenerator";
import { getCompanyDomain } from "../src/utils/domainExtractor";

async function main() {
  console.log("=== Debug Email Generation ===\n");

  // Get the lead directly
  const lead = await db
    .selectFrom("lead")
    .where("id", "=", "11828601-8b4b-499a-b73c-350b2064375a")
    .selectAll()
    .executeTakeFirst();

  if (!lead) {
    console.log("Lead not found");
    process.exit(1);
  }

  console.log("Lead Data:");
  console.log(`  ID: ${lead.id}`);
  console.log(`  First Name: "${lead.firstName}" (type: ${typeof lead.firstName})`);
  console.log(`  Last Name: "${lead.lastName}" (type: ${typeof lead.lastName})`);
  console.log(`  Company: "${lead.company}"`);
  console.log(`  Company Domain: "${lead.companyDomain}"`);
  console.log(`  LinkedIn URL: "${lead.linkedinUrl}"`);

  // Test domain extraction
  console.log("\n--- Testing Domain Extraction ---");
  const domain = await getCompanyDomain(
    lead.companyDomain,
    lead.company,
    lead.linkedinUrl,
    false // Don't use Serper for this test
  );
  console.log(`  Extracted domain: "${domain}"`);

  // Test email candidate generation
  console.log("\n--- Testing Email Candidate Generation ---");
  console.log(`  Calling: generateEmailCandidates("${lead.firstName}", "${lead.lastName}", "${domain || lead.companyDomain}")`);

  const candidates = generateEmailCandidates(
    lead.firstName,
    lead.lastName,
    domain || lead.companyDomain || "",
    []
  );

  console.log(`\n  Generated ${candidates.length} candidates:`);
  for (const c of candidates) {
    console.log(`    - ${c.email} (pattern: ${c.pattern})`);
  }

  if (candidates.length === 0) {
    console.log("\n  !!! NO CANDIDATES GENERATED !!!");
    console.log("  Checking why...");
    console.log(`    firstName truthy: ${!!lead.firstName}`);
    console.log(`    lastName truthy: ${!!lead.lastName}`);
    console.log(`    domain truthy: ${!!(domain || lead.companyDomain)}`);

    // Check for whitespace or special characters
    if (lead.firstName) {
      console.log(`    firstName bytes: ${Buffer.from(lead.firstName).toString('hex')}`);
    }
    if (lead.lastName) {
      console.log(`    lastName bytes: ${Buffer.from(lead.lastName).toString('hex')}`);
    }
  }

  await db.destroy();
}

main().catch(console.error);
