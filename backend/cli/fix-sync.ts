import "dotenv/config";
import { createOrUpdateResultList } from "../src/services/scrape.service";

const JOB_ID = "c9b18ca3-f08a-4d57-b358-9de319d38a19";

async function main() {
  console.log(`Syncing job ${JOB_ID} to create list with all leads...`);

  try {
    await createOrUpdateResultList(JOB_ID);
    console.log("Sync completed successfully!");
  } catch (error) {
    console.error("Sync failed:", error);
  }

  process.exit(0);
}

main();
