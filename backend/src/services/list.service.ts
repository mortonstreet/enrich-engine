import * as listRepository from "@/repositories/list.repository";
import * as listFolderRepository from "@/repositories/listFolder.repository";
import * as listFavoriteRepository from "@/repositories/listFavorite.repository";
import * as listOpenRepository from "@/repositories/listOpen.repository";
import * as leadRepository from "@/repositories/lead.repository";
import {
  CreateListRequest,
  UpdateListRequest,
  CreateFolderRequest,
  UpdateFolderRequest,
  GetListsQuery,
  GetLeadsQuery,
  GetAllLeadsQuery,
  CreateListFromLeadsRequest,
  CreateListFromFiltersRequest,
  ListResponse,
  FolderResponse,
  ListsPageResponse,
  ListDetailResponse,
  FavoritesResponse,
  RecentsResponse,
  FavoriteResponse,
  RecentResponse,
  AllLeadsResponse,
  LeadWithListResponse,
  CreateListFromLeadsResponse,
  CreateListFromFiltersResponse,
  LeadFilterOptionsResponse,
  UploadListCsvResponse,
  ListImportStatus,
} from "@shared/types/src";
import { DBUser } from "@shared/db/src/types";
import logger from "@/lib/logger";

// ============================================
// Helper Functions
// ============================================

const toListResponse = (
  list: Awaited<ReturnType<typeof listRepository.findListById>>,
  options?: {
    isFavorite?: boolean;
    lastOpenedAt?: Date | null;
    owner?: { id: string; name: string | null; image: string | null };
  },
): ListResponse => {
  if (!list) throw new Error("List not found");
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    folderId: list.folderId,
    importStatus: list.importStatus,
    leadCount: list.leadCount,
    source: list.source,
    scrapeJobId: list.scrapeJobId,
    createdById: list.createdById,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    isFavorite: options?.isFavorite,
    lastOpenedAt: options?.lastOpenedAt?.toISOString() ?? null,
    owner: options?.owner,
  };
};

const toFolderResponse = (
  folder: Awaited<ReturnType<typeof listFolderRepository.findById>>,
  options?: {
    isFavorite?: boolean;
    lastOpenedAt?: Date | null;
    owner?: { id: string; name: string | null; image: string | null };
  },
): FolderResponse => {
  if (!folder) throw new Error("Folder not found");
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    order: folder.order,
    createdById: folder.createdById,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    isFavorite: options?.isFavorite,
    lastOpenedAt: options?.lastOpenedAt?.toISOString() ?? null,
    owner: options?.owner,
  };
};

// ============================================
// List Operations
// ============================================

export const createList = async (
  organizationId: string,
  userId: string,
  request: CreateListRequest,
): Promise<ListResponse> => {
  const list = await listRepository.createList({
    organizationId,
    createdById: userId,
    name: request.name,
    description: request.description,
    folderId: request.folderId,
  });

  if (!list) {
    throw new Error("Failed to create list");
  }

  logger.info({ listId: list.id, userId }, "List created");
  return toListResponse(list, { isFavorite: false });
};

export const updateList = async (
  listId: string,
  organizationId: string,
  request: Omit<UpdateListRequest, "id">,
): Promise<ListResponse> => {
  const existing = await listRepository.findListById(listId);
  if (!existing) {
    throw new Error("List not found");
  }
  if (existing.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  // Only include defined fields in the update to avoid overwriting with undefined
  const updateData: Record<string, unknown> = {};
  if (request.name !== undefined) updateData.name = request.name;
  if (request.description !== undefined) updateData.description = request.description;
  if (request.folderId !== undefined) updateData.folderId = request.folderId;

  // Skip update if no fields to update
  if (Object.keys(updateData).length === 0) {
    return toListResponse(existing);
  }

  const updated = await listRepository.updateList(listId, updateData);

  if (!updated) {
    throw new Error("Failed to update list");
  }

  logger.info({ listId, updateData }, "List updated");
  return toListResponse(updated);
};

export const deleteList = async (
  listId: string,
  organizationId: string,
): Promise<void> => {
  const existing = await listRepository.findListById(listId);
  if (!existing) {
    throw new Error("List not found");
  }
  if (existing.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  await listRepository.deleteList(listId);
  logger.info({ listId }, "List deleted");
};

export const getLists = async (
  organizationId: string,
  userId: string,
  query: GetListsQuery,
): Promise<ListsPageResponse> => {
  const [lists, folders] = await Promise.all([
    listRepository.findListsByOrganizationId(organizationId, {
      folderId: query.folderId,
      search: query.search,
      ownerId: query.ownerId,
    }),
    listFolderRepository.findByOrganizationId(organizationId, {
      parentId: query.folderId,
      search: query.search,
      ownerId: query.ownerId,
    }),
  ]);

  // Get favorites and last opened times
  const listIds = lists.map((l) => l.id);
  const folderIds = folders.map((f) => f.id);

  const [listFavoriteIds, folderFavoriteIds, listOpenMap, folderOpenMap] =
    await Promise.all([
      listFavoriteRepository.getListFavoriteIds(userId),
      listFavoriteRepository.getFolderFavoriteIds(userId),
      listOpenRepository.getLastOpenedAtMap(userId, listIds),
      listOpenRepository.getLastOpenedAtMapForFolders(userId, folderIds),
    ]);

  const listFavoriteSet = new Set(listFavoriteIds);
  const folderFavoriteSet = new Set(folderFavoriteIds);

  return {
    lists: lists.map((list) =>
      toListResponse(list, {
        isFavorite: listFavoriteSet.has(list.id),
        lastOpenedAt: listOpenMap.get(list.id) ?? null,
      }),
    ),
    folders: folders.map((folder) =>
      toFolderResponse(folder, {
        isFavorite: folderFavoriteSet.has(folder.id),
        lastOpenedAt: folderOpenMap.get(folder.id) ?? null,
      }),
    ),
  };
};

export const getListDetail = async (
  listId: string,
  organizationId: string,
  userId: string,
  query: Omit<GetLeadsQuery, "id">,
): Promise<ListDetailResponse> => {
  const list = await listRepository.findListById(listId);
  if (!list) {
    throw new Error("List not found");
  }
  if (list.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  // Track open
  await listOpenRepository.create({
    userId,
    listId,
  });

  // Get leads with pagination
  const leadsResult = await leadRepository.findByListId(listId, {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    search: query.search,
  });

  // Check if favorite
  const favorite = await listFavoriteRepository.findByUserAndList(userId, listId);

  return {
    list: toListResponse(list, { isFavorite: !!favorite }),
    leads: leadsResult.data.map((lead) => ({
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
    })),
    pagination: {
      page: leadsResult.pagination.page,
      limit: leadsResult.pagination.limit,
      total: leadsResult.pagination.total,
      totalPages: leadsResult.pagination.totalPages,
    },
  };
};

// ============================================
// Folder Operations
// ============================================

export const createFolder = async (
  organizationId: string,
  userId: string,
  request: CreateFolderRequest,
): Promise<FolderResponse> => {
  const folder = await listFolderRepository.create({
    organizationId,
    createdById: userId,
    name: request.name,
    parentId: request.parentId,
  });

  if (!folder) {
    throw new Error("Failed to create folder");
  }

  logger.info({ folderId: folder.id, userId }, "Folder created");
  return toFolderResponse(folder, { isFavorite: false });
};

export const updateFolder = async (
  folderId: string,
  organizationId: string,
  request: Omit<UpdateFolderRequest, "id">,
): Promise<FolderResponse> => {
  const existing = await listFolderRepository.findById(folderId);
  if (!existing) {
    throw new Error("Folder not found");
  }
  if (existing.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  const updated = await listFolderRepository.update(folderId, {
    name: request.name,
    parentId: request.parentId,
    order: request.order,
  });

  if (!updated) {
    throw new Error("Failed to update folder");
  }

  return toFolderResponse(updated);
};

export const deleteFolder = async (
  folderId: string,
  organizationId: string,
): Promise<void> => {
  const existing = await listFolderRepository.findById(folderId);
  if (!existing) {
    throw new Error("Folder not found");
  }
  if (existing.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  await listFolderRepository.deleteById(folderId);
  logger.info({ folderId }, "Folder deleted");
};

export const trackFolderOpen = async (
  folderId: string,
  organizationId: string,
  userId: string,
): Promise<void> => {
  const folder = await listFolderRepository.findById(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }
  if (folder.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  await listOpenRepository.create({
    userId,
    folderId,
  });
};

// ============================================
// Favorite Operations
// ============================================

export const addFavorite = async (
  userId: string,
  listId?: string,
  folderId?: string,
): Promise<{ id: string }> => {
  // Check for existing favorite
  if (listId) {
    const existing = await listFavoriteRepository.findByUserAndList(userId, listId);
    if (existing) {
      return { id: existing.id };
    }
  }
  if (folderId) {
    const existing = await listFavoriteRepository.findByUserAndFolder(userId, folderId);
    if (existing) {
      return { id: existing.id };
    }
  }

  const favorite = await listFavoriteRepository.create({
    userId,
    listId: listId ?? null,
    folderId: folderId ?? null,
  });

  if (!favorite) {
    throw new Error("Failed to add favorite");
  }

  return { id: favorite.id };
};

export const removeFavorite = async (
  favoriteId: string,
  userId: string,
): Promise<void> => {
  const favorite = await listFavoriteRepository.findById(favoriteId);
  if (!favorite) {
    throw new Error("Favorite not found");
  }
  if (favorite.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await listFavoriteRepository.deleteById(favoriteId);
};

export const removeFavoriteByItem = async (
  userId: string,
  listId?: string,
  folderId?: string,
): Promise<void> => {
  if (listId) {
    await listFavoriteRepository.deleteByUserAndList(userId, listId);
  }
  if (folderId) {
    await listFavoriteRepository.deleteByUserAndFolder(userId, folderId);
  }
};

export const getFavorites = async (
  userId: string,
  organizationId: string,
): Promise<FavoritesResponse> => {
  const favorites = await listFavoriteRepository.findByUserId(userId);
  const result: FavoriteResponse[] = [];

  for (const fav of favorites) {
    if (fav.listId) {
      const list = await listRepository.findListById(fav.listId);
      if (list && list.organizationId === organizationId) {
        result.push({
          id: fav.id,
          type: "list",
          item: toListResponse(list, { isFavorite: true }),
          createdAt: fav.createdAt.toISOString(),
        });
      }
    }
    if (fav.folderId) {
      const folder = await listFolderRepository.findById(fav.folderId);
      if (folder && folder.organizationId === organizationId) {
        result.push({
          id: fav.id,
          type: "folder",
          item: toFolderResponse(folder, { isFavorite: true }),
          createdAt: fav.createdAt.toISOString(),
        });
      }
    }
  }

  return { favorites: result };
};

// ============================================
// Recent Operations
// ============================================

export const getRecents = async (
  userId: string,
  organizationId: string,
): Promise<RecentsResponse> => {
  const opens = await listOpenRepository.findByUserId(userId, 20);
  const result: RecentResponse[] = [];
  const seenLists = new Set<string>();
  const seenFolders = new Set<string>();

  for (const open of opens) {
    if (open.listId && !seenLists.has(open.listId)) {
      seenLists.add(open.listId);
      const list = await listRepository.findListById(open.listId);
      if (list && list.organizationId === organizationId) {
        const isFavorite = !!(await listFavoriteRepository.findByUserAndList(
          userId,
          open.listId,
        ));
        result.push({
          id: open.id,
          type: "list",
          item: toListResponse(list, { isFavorite }),
          openedAt: open.openedAt.toISOString(),
        });
      }
    }
    if (open.folderId && !seenFolders.has(open.folderId)) {
      seenFolders.add(open.folderId);
      const folder = await listFolderRepository.findById(open.folderId);
      if (folder && folder.organizationId === organizationId) {
        const isFavorite = !!(await listFavoriteRepository.findByUserAndFolder(
          userId,
          open.folderId,
        ));
        result.push({
          id: open.id,
          type: "folder",
          item: toFolderResponse(folder, { isFavorite }),
          openedAt: open.openedAt.toISOString(),
        });
      }
    }
  }

  return { recents: result };
};

// ============================================
// Lead Operations
// ============================================

export const updateLead = async (
  leadId: string,
  organizationId: string,
  data: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    linkedinUrl?: string | null;
    customFields?: Record<string, unknown>;
  },
): Promise<void> => {
  const lead = await leadRepository.findById(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  if (lead.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  await leadRepository.update(leadId, data);
};

// ============================================
// Export Operations
// ============================================

export const exportListAsCSV = async (
  listId: string,
  organizationId: string,
): Promise<string> => {
  const list = await listRepository.findListById(listId);
  if (!list) {
    throw new Error("List not found");
  }
  if (list.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  const leads = await leadRepository.findAllByListId(listId);

  // Build CSV
  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company",
    "Role",
    "LinkedIn URL",
  ];
  const rows = leads.map((lead) => [
    lead.firstName ?? "",
    lead.lastName ?? "",
    lead.email ?? "",
    lead.phone ?? "",
    lead.company ?? "",
    lead.role ?? "",
    lead.linkedinUrl ?? "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  return csvContent;
};

// ============================================
// All Leads Operations
// ============================================

export const getAllLeads = async (
  organizationId: string,
  query: GetAllLeadsQuery,
): Promise<AllLeadsResponse> => {
  const result = await leadRepository.findAllByOrganizationWithFilters(organizationId, {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    search: query.search,
    listId: query.listId,
    company: query.company,
    role: query.role,
    hasEmail: query.hasEmail,
    hasPhone: query.hasPhone,
    hasLinkedinUrl: query.hasLinkedinUrl,
    createdAfter: query.createdAfter,
    createdBefore: query.createdBefore,
  });

  const leadsWithList: LeadWithListResponse[] = result.data.map((lead) => ({
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
    listId: lead.listId,
    listName: lead.listName,
  }));

  return {
    data: leadsWithList,
    pagination: result.pagination,
  };
};

// Get filter options for UI
export const getLeadFilterOptions = async (
  organizationId: string,
): Promise<LeadFilterOptionsResponse> => {
  const [companies, roles] = await Promise.all([
    leadRepository.getUniqueCompanies(organizationId),
    leadRepository.getUniqueRoles(organizationId),
  ]);

  return { companies, roles };
};

// Create list from filters (targeted list building)
export const createListFromFilters = async (
  organizationId: string,
  userId: string,
  request: CreateListFromFiltersRequest,
): Promise<CreateListFromFiltersResponse> => {
  // Fetch leads matching the filters (get up to maxLeads * 2 to account for deduplication)
  const fetchLimit = request.dedupe ? request.maxLeads * 2 : request.maxLeads;

  const result = await leadRepository.findAllByOrganizationWithFilters(organizationId, {
    page: 1,
    limit: fetchLimit,
    search: request.search,
    listId: request.listId,
    company: request.company,
    role: request.role,
    hasEmail: request.hasEmail,
    hasPhone: request.hasPhone,
    hasLinkedinUrl: request.hasLinkedinUrl,
    createdAfter: request.createdAfter,
    createdBefore: request.createdBefore,
  });

  const totalMatched = result.pagination.total;

  if (result.data.length === 0) {
    throw new Error("No leads match the specified filters");
  }

  // Create the new list
  const list = await listRepository.createList({
    organizationId,
    createdById: userId,
    name: request.name,
    description: request.description,
    folderId: request.folderId,
  });

  if (!list) {
    throw new Error("Failed to create list");
  }

  // Apply deduplication if enabled
  let leadsToCreate = result.data;
  let deduplicatedCount = 0;

  if (request.dedupe) {
    // Dedupe by LinkedIn URL within the batch
    const seenLinkedinUrls = new Set<string>();
    leadsToCreate = result.data.filter((lead) => {
      if (!lead.linkedinUrl) return true; // Keep leads without LinkedIn URLs
      const normalizedUrl = lead.linkedinUrl.toLowerCase().trim().replace(/\/$/, "");
      if (seenLinkedinUrls.has(normalizedUrl)) {
        deduplicatedCount++;
        return false;
      }
      seenLinkedinUrls.add(normalizedUrl);
      return true;
    });
  }

  // Limit to maxLeads
  leadsToCreate = leadsToCreate.slice(0, request.maxLeads);

  // Copy leads to the new list
  const leadsData = leadsToCreate.map((lead) => ({
    listId: list.id,
    organizationId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    role: lead.role,
    linkedinUrl: lead.linkedinUrl,
    companyDomain: lead.companyDomain,
    customFields: lead.customFields as Record<string, unknown> | undefined,
  }));

  const createdLeads = await leadRepository.bulkCreate(leadsData);

  // Update list lead count
  await listRepository.updateList(list.id, {
    leadCount: createdLeads.length,
  });

  logger.info(
    {
      listId: list.id,
      userId,
      leadsCreated: createdLeads.length,
      totalMatched,
      deduplicatedCount,
      filters: {
        company: request.company,
        role: request.role,
        hasEmail: request.hasEmail,
        hasLinkedinUrl: request.hasLinkedinUrl,
      },
    },
    "List created from filters",
  );

  return {
    list: toListResponse({ ...list, leadCount: createdLeads.length }, { isFavorite: false }),
    leadsCreated: createdLeads.length,
    totalMatched,
    deduplicatedCount,
  };
};

export const createListFromLeads = async (
  organizationId: string,
  userId: string,
  request: CreateListFromLeadsRequest,
): Promise<CreateListFromLeadsResponse> => {
  // Verify all leads belong to this organization
  const leads = await leadRepository.findByIds(request.leadIds, organizationId);
  if (leads.length !== request.leadIds.length) {
    throw new Error("Some leads were not found or don't belong to this organization");
  }

  // Create the new list
  const list = await listRepository.createList({
    organizationId,
    createdById: userId,
    name: request.name,
    description: request.description,
    folderId: request.folderId,
  });

  if (!list) {
    throw new Error("Failed to create list");
  }

  // Copy leads to the new list
  const leadsToCreate = leads.map((lead) => ({
    listId: list.id,
    organizationId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    role: lead.role,
    linkedinUrl: lead.linkedinUrl,
    companyDomain: lead.companyDomain,
    customFields: lead.customFields as Record<string, unknown> | undefined,
  }));

  const createdLeads = await leadRepository.bulkCreate(leadsToCreate);

  // Update list lead count
  await listRepository.updateList(list.id, {
    leadCount: createdLeads.length,
  });

  logger.info(
    { listId: list.id, userId, leadsCreated: createdLeads.length },
    "List created from selected leads",
  );

  return {
    list: toListResponse({ ...list, leadCount: createdLeads.length }, { isFavorite: false }),
    leadsCreated: createdLeads.length,
  };
};

export const deleteLead = async (
  leadId: string,
  organizationId: string,
): Promise<void> => {
  const lead = await leadRepository.findById(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  if (lead.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  await leadRepository.deleteById(leadId);

  // Update list lead count
  const newCount = await leadRepository.countByListId(lead.listId);
  await listRepository.updateList(lead.listId, { leadCount: newCount });

  logger.info({ leadId }, "Lead deleted");
};

// ============================================
// CSV Upload Operations
// ============================================

/**
 * Normalizes a company domain from various formats:
 * - Full URLs: "https://www.example.com/about" → "example.com"
 * - With www: "www.example.com" → "example.com"
 * - Plain domain: "example.com" → "example.com"
 * - With protocol only: "http://example.com" → "example.com"
 */
function normalizeCompanyDomain(input: string): string | undefined {
  if (!input || typeof input !== "string") return undefined;

  let domain = input.trim().toLowerCase();

  // If it looks like a URL (has protocol), parse it
  if (domain.includes("://")) {
    try {
      const parsed = new URL(domain);
      domain = parsed.hostname;
    } catch {
      // If URL parsing fails, continue with manual cleanup
    }
  }

  // Remove protocol if present without proper URL format
  domain = domain.replace(/^https?:\/\//i, "");

  // Remove www. prefix
  domain = domain.replace(/^www\./i, "");

  // Remove any path, query string, or hash
  domain = domain.split("/")[0].split("?")[0].split("#")[0];

  // Basic validation: should have at least one dot and no spaces
  if (!domain.includes(".") || domain.includes(" ")) {
    return undefined;
  }

  return domain || undefined;
}

// Field mappings for CSV headers (case-insensitive)
const FIELD_MAPPINGS: Record<string, string> = {
  // First name variations
  first_name: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  first: "firstName",
  fname: "firstName",
  // Last name variations
  last_name: "lastName",
  lastname: "lastName",
  "last name": "lastName",
  last: "lastName",
  lname: "lastName",
  surname: "lastName",
  // Email variations
  email: "email",
  email_address: "email",
  emailaddress: "email",
  "email address": "email",
  // Phone variations
  phone: "phone",
  phone_number: "phone",
  phonenumber: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  telephone: "phone",
  // Company variations
  company: "company",
  company_name: "company",
  companyname: "company",
  "company name": "company",
  organization: "company",
  org: "company",
  // Role/Title variations
  role: "role",
  title: "role",
  job_title: "role",
  jobtitle: "role",
  "job title": "role",
  position: "role",
  // LinkedIn variations
  linkedin_url: "linkedinUrl",
  linkedinurl: "linkedinUrl",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  linkedin_profile: "linkedinUrl",
  // Domain/Website variations (for email guessing)
  domain: "companyDomain",
  website: "companyDomain",
  company_domain: "companyDomain",
  companydomain: "companyDomain",
  "company domain": "companyDomain",
  company_website: "companyDomain",
  companywebsite: "companyDomain",
  "company website": "companyDomain",
  url: "companyDomain",
  site: "companyDomain",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());

  return result;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);

  return { headers, rows };
}

interface ParsedLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  companyDomain?: string;
  customFields?: Record<string, unknown>;
}

function mapRowToLead(headers: string[], row: string[]): ParsedLead | null {
  const lead: ParsedLead = {};
  const customFields: Record<string, unknown> = {};

  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i].toLowerCase().trim();
    const value = row[i]?.trim();

    if (!value) continue;

    const mappedField = FIELD_MAPPINGS[header];
    if (mappedField) {
      (lead as Record<string, string>)[mappedField] = value;
    } else {
      // Store as custom field
      customFields[headers[i].trim()] = value;
    }
  }

  // At least one identifying field is required
  if (!lead.email && !lead.phone && !lead.linkedinUrl && !lead.firstName && !lead.lastName) {
    return null;
  }

  if (Object.keys(customFields).length > 0) {
    lead.customFields = customFields;
  }

  return lead;
}

export const uploadListCsv = async (params: {
  listId: string;
  organizationId: string;
  userId: string;
  file: Express.Multer.File;
}): Promise<UploadListCsvResponse> => {
  // Validate list exists and belongs to org
  const list = await listRepository.findListById(params.listId);
  if (!list) {
    throw new Error("List not found");
  }
  if (list.organizationId !== params.organizationId) {
    throw new Error("Unauthorized");
  }

  // Update import status to processing
  await listRepository.updateList(params.listId, {
    importStatus: ListImportStatus.PROCESSING,
  });

  try {
    // Parse CSV content
    const csvContent = params.file.buffer.toString("utf-8");
    const { headers, rows } = parseCSV(csvContent);

    if (headers.length === 0) {
      throw new Error("CSV file is empty or has no headers");
    }

    // Map rows to leads
    const leads: ParsedLead[] = [];
    for (const row of rows) {
      const lead = mapRowToLead(headers, row);
      if (lead) {
        leads.push(lead);
      }
    }

    if (leads.length === 0) {
      throw new Error("No valid leads found in CSV");
    }

    // Batch create leads
    const BATCH_SIZE = 100;
    let totalCreated = 0;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const leadsData = batch.map((lead) => ({
        listId: params.listId,
        organizationId: params.organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        role: lead.role,
        linkedinUrl: lead.linkedinUrl,
        companyDomain: lead.companyDomain ? normalizeCompanyDomain(lead.companyDomain) : undefined,
        customFields: lead.customFields,
      }));

      const created = await leadRepository.bulkCreate(leadsData);
      totalCreated += created.length;
    }

    // Update list lead count and status
    const newCount = await leadRepository.countByListId(params.listId);
    await listRepository.updateList(params.listId, {
      leadCount: newCount,
      importStatus: ListImportStatus.COMPLETED,
    });

    logger.info(
      {
        listId: params.listId,
        userId: params.userId,
        leadsCreated: totalCreated,
        fileName: params.file.originalname,
      },
      "CSV uploaded successfully",
    );

    return {
      success: true,
      message: `Successfully imported ${totalCreated} leads`,
      leadsCreated: totalCreated,
    };
  } catch (error) {
    // Update status to failed
    await listRepository.updateList(params.listId, {
      importStatus: ListImportStatus.FAILED,
    });

    logger.error(
      {
        listId: params.listId,
        userId: params.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "CSV upload failed",
    );

    throw error;
  }
};
