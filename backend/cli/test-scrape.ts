import "dotenv/config";
import { searchLinkedIn, buildNameQuery, buildRoleQuery, extractLinkedInResult } from "../src/clients/serper.client";
import { config } from "../src/config";

async function main() {
  console.log("=== Test LinkedIn Scrape Name Extraction ===\n");

  if (!config.serper.apiKey) {
    console.log("ERROR: SERPER_API_KEY not configured in .env");
    process.exit(1);
  }

  // Test case 1: Search by role at a company
  console.log("Test 1: Role-based search (CEO at Spectral AI)");
  console.log("Query: site:linkedin.com/in/ \"CEO\" \"Spectral AI\"");
  console.log("");

  try {
    const roleResult = await searchLinkedIn(buildRoleQuery("Spectral AI", "CEO"));
    console.log("Result:");
    console.log(`  LinkedIn URL: ${roleResult.linkedinUrl || "NOT FOUND"}`);
    console.log(`  First Name: ${roleResult.firstName || "NOT EXTRACTED"}`);
    console.log(`  Last Name: ${roleResult.lastName || "NOT EXTRACTED"}`);
    console.log(`  Ready for guessing: ${roleResult.firstName && roleResult.lastName ? "YES" : "NO"}`);

    if (roleResult.rawResponse?.organic?.[0]) {
      console.log(`  Raw title: "${roleResult.rawResponse.organic[0].title}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n---\n");

  // Test case 2: Search by name
  console.log("Test 2: Name-based search (Eddie Anderson at Spectral AI)");
  console.log("Query: site:linkedin.com/in/ \"Eddie Anderson\" \"Spectral AI\"");
  console.log("");

  try {
    const nameResult = await searchLinkedIn(buildNameQuery("Eddie", "Anderson", "Spectral AI"));
    console.log("Result:");
    console.log(`  LinkedIn URL: ${nameResult.linkedinUrl || "NOT FOUND"}`);
    console.log(`  First Name: ${nameResult.firstName || "NOT EXTRACTED"}`);
    console.log(`  Last Name: ${nameResult.lastName || "NOT EXTRACTED"}`);
    console.log(`  Ready for guessing: ${nameResult.firstName && nameResult.lastName ? "YES" : "NO"}`);

    if (nameResult.rawResponse?.organic?.[0]) {
      console.log(`  Raw title: "${nameResult.rawResponse.organic[0].title}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n---\n");

  // Test case 3: Generic role search to see name extraction
  console.log("Test 3: Generic search (Software Engineer at Anthropic)");
  console.log("Query: site:linkedin.com/in/ \"Software Engineer\" \"Anthropic\"");
  console.log("");

  try {
    const genericResult = await searchLinkedIn(buildRoleQuery("Anthropic", "Software Engineer"));
    console.log("Result:");
    console.log(`  LinkedIn URL: ${genericResult.linkedinUrl || "NOT FOUND"}`);
    console.log(`  First Name: ${genericResult.firstName || "NOT EXTRACTED"}`);
    console.log(`  Last Name: ${genericResult.lastName || "NOT EXTRACTED"}`);
    console.log(`  Ready for guessing: ${genericResult.firstName && genericResult.lastName ? "YES" : "NO"}`);

    if (genericResult.rawResponse?.organic?.[0]) {
      console.log(`  Raw title: "${genericResult.rawResponse.organic[0].title}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  }

  console.log("\n=== Summary ===");
  console.log("If first/last names are extracted, the scrape will populate leads correctly.");
  console.log("The email guesser requires: firstName + lastName + (companyDomain OR companyName)");
}

main().catch(console.error);
