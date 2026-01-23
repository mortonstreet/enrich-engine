import { Router } from "express";
import { searchPeople } from "@/api/controllers/search.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  SearchPeopleRequest,
  SearchPeopleRequestSchema,
} from "@shared/types/src";

const router = Router();

// Search for people by role, company, or free-text query
router.post(
  "/people",
  withBetterAuth,
  validateAndMerge(SearchPeopleRequestSchema),
  authenticatedRoute<SearchPeopleRequest>(searchPeople)
);

export default router;
