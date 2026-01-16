import { Router } from "express";
import { addToWaitlist } from "@/api/controllers/waitlist.controller";
import { validatedRoute } from "./utils";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import { WaitlistRequest, WaitlistRequestSchema } from "@shared/types/src";

const router = Router();

// Add email to waitlist (public route - no auth required)
router.post(
  "/",
  validateAndMerge(WaitlistRequestSchema),
  validatedRoute<WaitlistRequest>(addToWaitlist),
);

export default router;
