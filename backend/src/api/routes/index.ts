import { Router } from "express";
import { getSerperRateLimiter } from "@/lib/rateLimiter/serperRateLimiter";
import { getDomainCache } from "@/lib/cache";
import { getAgentStats } from "@/lib/httpAgent";
import { getAdaptiveRateLimiterState } from "@/clients/serper.client";
import exampleRoutes from "./example";
import adminRoutes from "./admin";
import organizationRoutes from "./organization";
import userRoutes from "./user";
import notificationRoutes from "./notification";
import pusherRoutes from "./pusher";
import enrichmentRoutes from "./enrichment";
import waitlistRoutes from "./waitlist";
import scrapeRoutes from "./scrape";
import listsRoutes from "./lists";
import enrichRoutes from "./enrich";
import copyGeneratorRoutes from "./copyGenerator";
import externalApiKeyRoutes from "./externalApiKey";
import externalRoutes from "./external";
import blogRoutes from "./blog";
import searchRoutes from "./search";
import verificationRoutes from "./verification";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/health/rate-limiter", async (req, res) => {
  const limiter = getSerperRateLimiter();
  const stats = await limiter.getStats?.();

  res.json({
    status: "ok",
    rateLimiter: {
      ...((stats as object) || {}),
      type: stats ? "redis" : "local",
    },
  });
});

router.get("/health/cache", async (req, res) => {
  const cache = getDomainCache();
  const cacheStats = cache ? await cache.getStats() : null;
  const agentStats = getAgentStats();
  const adaptiveStats = getAdaptiveRateLimiterState();

  res.json({
    status: "ok",
    domainCache: cacheStats
      ? {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
          size: cacheStats.size,
          enabled: true,
        }
      : { enabled: false },
    httpAgent: agentStats,
    adaptiveRateLimiter: adaptiveStats,
  });
});

router.use("/example", exampleRoutes);
router.use("/admin", adminRoutes);
router.use("/organization", organizationRoutes);
router.use("/user", userRoutes);
router.use("/notifications", notificationRoutes);
router.use("/pusher", pusherRoutes);
router.use("/enrichment", enrichmentRoutes);
router.use("/waitlist", waitlistRoutes);
router.use("/scrape", scrapeRoutes);
router.use("/lists", listsRoutes);
router.use("/enrich", enrichRoutes);
router.use("/copy-generator", copyGeneratorRoutes);
router.use("/external/api-keys", externalApiKeyRoutes);
router.use("/external", externalRoutes);
router.use("/blog", blogRoutes);
router.use("/search", searchRoutes);
router.use("/verification", verificationRoutes);
router.use("/sentry", (req, res) => {
  throw new Error("Testing sentry error");
});

export const apiRoutes = router;
