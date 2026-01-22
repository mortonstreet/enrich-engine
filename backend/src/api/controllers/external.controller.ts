import { ExternalApiRequestHandler } from "@/types/handlers";
import { db } from "@/lib/db";
import logger from "@/lib/logger";
import {
  ExternalListsQuery,
  ExternalListDetailQuery,
  ExternalListIdRequest,
  ExternalListResponse,
  ExternalListsResponse,
  ExternalListDetailResponse,
  ExternalLeadResponse,
} from "@shared/types/src";
import { StatusCodes } from "http-status-codes";

// ============================================
// External Lists API (API Key authenticated)
// ============================================

export const getLists: ExternalApiRequestHandler<ExternalListsQuery> = async (
  req,
  res
) => {
  const { organizationId, keyId } = req.externalAuth;
  const { page, limit, search } = req.validated;

  logger.info(
    { organizationId, keyId, page, limit, search },
    "External API: getLists"
  );

  try {
    // Build query
    let query = db
      .selectFrom("lead_list")
      .where("organizationId", "=", organizationId)
      .where("importStatus", "=", "completed");

    if (search) {
      query = query.where("name", "ilike", `%${search}%`);
    }

    // Get total count
    const countResult = await db
      .selectFrom("lead_list")
      .where("organizationId", "=", organizationId)
      .where("importStatus", "=", "completed")
      .$if(!!search, (qb) => qb.where("name", "ilike", `%${search}%`))
      .select(db.fn.count<number>("id").as("count"))
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);

    // Get paginated results
    const lists = await query
      .select([
        "id",
        "name",
        "description",
        "leadCount",
        "source",
        "createdAt",
        "updatedAt",
      ])
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    const response: ExternalListsResponse = {
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        leadCount: list.leadCount,
        source: list.source as "uploaded" | "scraped",
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message, organizationId }, "External API: getLists failed");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
  }
};

export const getListById: ExternalApiRequestHandler<
  ExternalListDetailQuery & ExternalListIdRequest
> = async (req, res) => {
  const { organizationId, keyId } = req.externalAuth;
  const { listId, page, limit } = req.validated;

  logger.info(
    { organizationId, keyId, listId, page, limit },
    "External API: getListById"
  );

  try {
    // Get the list
    const list = await db
      .selectFrom("lead_list")
      .where("id", "=", listId)
      .where("organizationId", "=", organizationId)
      .select([
        "id",
        "name",
        "description",
        "leadCount",
        "source",
        "createdAt",
        "updatedAt",
      ])
      .executeTakeFirst();

    if (!list) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "List not found" });
    }

    // Get total lead count
    const countResult = await db
      .selectFrom("lead")
      .where("listId", "=", listId)
      .select(db.fn.count<number>("id").as("count"))
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);

    // Get paginated leads
    const leads = await db
      .selectFrom("lead")
      .where("listId", "=", listId)
      .select([
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "company",
        "role",
        "linkedinUrl",
        "companyDomain",
        "customFields",
        "createdAt",
        "updatedAt",
      ])
      .orderBy("createdAt", "asc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    const listResponse: ExternalListResponse = {
      id: list.id,
      name: list.name,
      description: list.description,
      leadCount: list.leadCount,
      source: list.source as "uploaded" | "scraped",
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };

    const leadsResponse: ExternalLeadResponse[] = leads.map((lead) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      role: lead.role,
      linkedinUrl: lead.linkedinUrl,
      companyDomain: lead.companyDomain,
      customFields: (lead.customFields as Record<string, unknown>) ?? {},
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    }));

    const response: ExternalListDetailResponse = {
      list: listResponse,
      leads: leadsResponse,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { error: message, organizationId, listId },
      "External API: getListById failed"
    );
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
  }
};
