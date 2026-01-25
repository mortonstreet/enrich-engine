// backend/src/lib/cache/cacheWarmer.ts

import { DomainCache } from './domainCache';

/**
 * Common companies with known domains
 * Add more as needed based on your user base
 */
const KNOWN_DOMAINS: Array<{ company: string; domain: string }> = [
  { company: 'Google', domain: 'google.com' },
  { company: 'Microsoft', domain: 'microsoft.com' },
  { company: 'Apple', domain: 'apple.com' },
  { company: 'Amazon', domain: 'amazon.com' },
  { company: 'Meta', domain: 'meta.com' },
  { company: 'Facebook', domain: 'facebook.com' },
  { company: 'Netflix', domain: 'netflix.com' },
  { company: 'Salesforce', domain: 'salesforce.com' },
  { company: 'Oracle', domain: 'oracle.com' },
  { company: 'IBM', domain: 'ibm.com' },
  { company: 'Intel', domain: 'intel.com' },
  { company: 'Cisco', domain: 'cisco.com' },
  { company: 'Adobe', domain: 'adobe.com' },
  { company: 'SAP', domain: 'sap.com' },
  { company: 'Stripe', domain: 'stripe.com' },
  { company: 'Shopify', domain: 'shopify.com' },
  { company: 'Slack', domain: 'slack.com' },
  { company: 'Zoom', domain: 'zoom.us' },
  { company: 'Twitter', domain: 'twitter.com' },
  { company: 'X', domain: 'x.com' },
  { company: 'LinkedIn', domain: 'linkedin.com' },
  { company: 'Uber', domain: 'uber.com' },
  { company: 'Lyft', domain: 'lyft.com' },
  { company: 'Airbnb', domain: 'airbnb.com' },
  { company: 'Square', domain: 'squareup.com' },
  { company: 'Block', domain: 'block.xyz' },
  { company: 'PayPal', domain: 'paypal.com' },
  { company: 'Intuit', domain: 'intuit.com' },
  { company: 'HubSpot', domain: 'hubspot.com' },
  { company: 'Atlassian', domain: 'atlassian.com' },
  { company: 'Twilio', domain: 'twilio.com' },
  { company: 'Datadog', domain: 'datadoghq.com' },
  { company: 'Snowflake', domain: 'snowflake.com' },
  { company: 'MongoDB', domain: 'mongodb.com' },
  { company: 'Cloudflare', domain: 'cloudflare.com' },
  { company: 'Okta', domain: 'okta.com' },
  { company: 'Zscaler', domain: 'zscaler.com' },
  { company: 'CrowdStrike', domain: 'crowdstrike.com' },
  { company: 'Palo Alto Networks', domain: 'paloaltonetworks.com' },
  { company: 'ServiceNow', domain: 'servicenow.com' },
  { company: 'Workday', domain: 'workday.com' },
  { company: 'Splunk', domain: 'splunk.com' },
  { company: 'Tableau', domain: 'tableau.com' },
  { company: 'GitHub', domain: 'github.com' },
  { company: 'GitLab', domain: 'gitlab.com' },
  { company: 'Vercel', domain: 'vercel.com' },
  { company: 'Netlify', domain: 'netlify.com' },
  { company: 'Heroku', domain: 'heroku.com' },
  { company: 'DigitalOcean', domain: 'digitalocean.com' },
];

/**
 * Warms the domain cache with known company domains
 */
export async function warmDomainCache(cache: DomainCache): Promise<{
  warmed: number;
  skipped: number;
}> {
  let warmed = 0;
  let skipped = 0;

  for (const { company, domain } of KNOWN_DOMAINS) {
    const existing = await cache.get(company);

    if (existing === undefined) {
      await cache.set(company, domain);
      warmed++;
    } else {
      skipped++;
    }
  }

  console.log(`Domain cache warmed: ${warmed} new entries, ${skipped} already cached`);

  return { warmed, skipped };
}

/**
 * Extracts unique companies from scrape job items for cache warming
 */
export function extractCompaniesFromItems(
  items: Array<{ inputData: Record<string, string> }>
): string[] {
  const companies = new Set<string>();

  for (const item of items) {
    if (item.inputData.company) {
      companies.add(item.inputData.company);
    }
  }

  return Array.from(companies);
}

/**
 * Pre-fetches domains for companies that aren't cached
 */
export async function prefetchDomains(
  cache: DomainCache,
  companies: string[],
  fetcher: (company: string) => Promise<string | null>,
  concurrency: number = 10
): Promise<{ cached: number; fetched: number; failed: number }> {
  let cached = 0;
  let fetched = 0;
  let failed = 0;

  // Check which companies need fetching
  const toFetch: string[] = [];

  for (const company of companies) {
    const existing = await cache.get(company);
    if (existing === undefined) {
      toFetch.push(company);
    } else {
      cached++;
    }
  }

  // Fetch in batches
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (company) => {
        const domain = await fetcher(company);
        await cache.set(company, domain);
        return domain;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        fetched++;
      } else {
        failed++;
      }
    }
  }

  return { cached, fetched, failed };
}
