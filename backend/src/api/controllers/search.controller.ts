import { AuthRequestHandler } from "@/types/handlers";
import * as searchService from "@/services/search.service";
import { SearchPeopleRequest } from "@shared/types/src";
import { createErrorResponse, ErrorCodes } from "@/lib/errors";
import { StatusCodes } from "http-status-codes";

export const searchPeople: AuthRequestHandler<SearchPeopleRequest> = async (req, res) => {
  const { query, role, company, location, page, limit } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const requestId = req.headers["x-request-id"] as string | undefined;

  if (!organizationId) {
    return res.status(StatusCodes.BAD_REQUEST).json(
      createErrorResponse(
        "No active organization",
        ErrorCodes.NO_ACTIVE_ORGANIZATION,
        undefined,
        requestId
      )
    );
  }

  // Require at least one search parameter
  if (!query && !role && !company) {
    return res.status(StatusCodes.BAD_REQUEST).json(
      createErrorResponse(
        "At least one search parameter (query, role, or company) is required",
        ErrorCodes.MISSING_REQUIRED_FIELD,
        { requiredFields: ["query", "role", "company"] },
        requestId
      )
    );
  }

  const result = await searchService.searchPeople({
    query,
    role,
    company,
    location,
    page,
    limit,
  });

  res.json(result);
};
