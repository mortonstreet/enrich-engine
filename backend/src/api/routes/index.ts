import { Router } from "express";
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

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
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
router.use("/sentry", (req, res) => {
  throw new Error("Testing sentry error");
});

export const apiRoutes = router;
