import "dotenv/config";
import { db } from "../src/lib/db";
import { generateEmailCandidates } from "../src/utils/emailPatternGenerator";
import { getCompanyDomain } from "../src/utils/domainExtractor";
import { validateEmail, mapMillionVerifierStatus } from "../src/clients/millionverifier.client";
import * as vendorApiKeyRepository from "../src/repositories/vendorApiKey.repository";
import { decrypt } from "../src/lib/encryption";

async function main() {
  console.log("=== Test Full Email Guessing Flow ===\n");

  const leadId = "11828601-8b4b-499a-b73c-350b2064375a";

  // Get the lead
  const lead = await db
    .selectFrom("lead")
    .where("id", "=", leadId)
    .selectAll()
    .executeTakeFirst();

  if (!lead) {
    console.log("Lead not found");
    process.exit(1);
  }

  console.log("Lead Data:");
  console.log(`  First Name: ${lead.firstName || "MISSING"}`);
  console.log(`  Last Name: ${lead.lastName || "MISSING"}`);
  console.log(`  Company: ${lead.company || "NOT SET"}`);
  console.log(`  Company Domain: ${lead.companyDomain || "NOT SET"}`);

  // Get domain (simulating what worker does)
  console.log("\n--- Step 1: Get Domain ---");
  const domain = await getCompanyDomain(
    lead.companyDomain,
    lead.company,
    lead.linkedinUrl,
    false // Don't use Serper in this test
  );
  console.log(`  Domain: ${domain}`);

  if (!domain) {
    console.log("  FAILED: No domain found");
    process.exit(1);
  }

  // Generate candidates
  console.log("\n--- Step 2: Generate Email Candidates ---");
  const candidates = generateEmailCandidates(
    lead.firstName,
    lead.lastName,
    domain,
    []
  );
  console.log(`  Generated ${candidates.length} candidates`);

  if (candidates.length === 0) {
    console.log("  FAILED: No candidates generated");
    console.log(`    firstName: "${lead.firstName}" (truthy: ${!!lead.firstName})`);
    console.log(`    lastName: "${lead.lastName}" (truthy: ${!!lead.lastName})`);
    console.log(`    domain: "${domain}" (truthy: ${!!domain})`);
    process.exit(1);
  }

  for (const c of candidates.slice(0, 5)) {
    console.log(`    - ${c.email} (${c.pattern})`);
  }
  console.log(`    ... and ${candidates.length - 5} more`);

  // Get MillionVerifier API key
  console.log("\n--- Step 3: Get MillionVerifier API Key ---");
  const mvKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    lead.organizationId,
    "millionverifier"
  );

  if (!mvKeyRecord) {
    console.log("  FAILED: MillionVerifier API key not configured for this organization");
    process.exit(1);
  }

  const mvApiKey = decrypt(mvKeyRecord.encryptedKey);
  console.log(`  API Key: ${mvApiKey.substring(0, 8)}...`);

  // Test validation (just the first candidate)
  console.log("\n--- Step 4: Validate First Candidate ---");
  const testCandidate = candidates[0];
  console.log(`  Testing: ${testCandidate.email}`);

  try {
    const validationResult = await validateEmail(testCandidate.email, mvApiKey);
    const status = mapMillionVerifierStatus(validationResult);

    console.log(`  Result:`);
    console.log(`    Raw: ${validationResult.result} (code: ${validationResult.resultcode})`);
    console.log(`    Mapped Status: ${status}`);
    console.log(`    Credits remaining: ${validationResult.credits}`);

    if (status === "valid") {
      console.log(`\n  SUCCESS! Valid email found: ${testCandidate.email}`);
    } else if (status === "catch_all") {
      console.log(`\n  CATCH-ALL domain - email format accepted but not verifiable`);
    } else if (status === "bounced") {
      console.log(`\n  BOUNCED - this pattern doesn't work for this domain`);
    } else {
      console.log(`\n  UNKNOWN - could not determine validity`);
    }
  } catch (error) {
    console.log(`  ERROR: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n=== Flow Complete ===");
  console.log("If you run another enrichment job now, it should work with this lead.");

  await db.destroy();
}

main().catch(console.error);
