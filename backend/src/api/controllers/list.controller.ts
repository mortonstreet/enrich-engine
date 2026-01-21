import { AuthRequestHandler } from "@/types/handlers";
import * as listService from "@/services/list.service";
import {
  CreateListRequest,
  UpdateListRequest,
  GetListRequest,
  DeleteListRequest,
  CreateFolderRequest,
  UpdateFolderRequest,
  DeleteFolderRequest,
  AddFavoriteRequest,
  RemoveFavoriteRequest,
  GetListsQuery,
  GetLeadsQuery,
  GetAllLeadsQuery,
  CreateListFromLeadsRequest,
  CreateListFromFiltersRequest,
  DeleteLeadRequest,
  TrackOpenRequest,
  UpdateLeadRequest,
  UploadListCsvRequest,
} from "@shared/types/src";

// ============================================
// List Controllers
// ============================================

export const createList: AuthRequestHandler<CreateListRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.createList(
    organizationId,
    req.user.id,
    req.validated,
  );

  res.status(201).json(result);
};

export const updateList: AuthRequestHandler<UpdateListRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { id, ...data } = req.validated;
  const result = await listService.updateList(id, organizationId, data);

  res.json(result);
};

export const deleteList: AuthRequestHandler<DeleteListRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  await listService.deleteList(req.validated.id, organizationId);

  res.status(204).send();
};

export const getLists: AuthRequestHandler<GetListsQuery> = async (req, res) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.getLists(
    organizationId,
    req.user.id,
    req.validated,
  );

  res.json(result);
};

export const getListDetail: AuthRequestHandler<GetLeadsQuery> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { id, ...query } = req.validated;
  const result = await listService.getListDetail(
    id,
    organizationId,
    req.user.id,
    query,
  );

  res.json(result);
};

export const exportList: AuthRequestHandler<GetListRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const csvContent = await listService.exportListAsCSV(
    req.validated.id,
    organizationId,
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="list-export-${req.validated.id}.csv"`,
  );
  res.send(csvContent);
};

// ============================================
// Folder Controllers
// ============================================

export const createFolder: AuthRequestHandler<CreateFolderRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.createFolder(
    organizationId,
    req.user.id,
    req.validated,
  );

  res.status(201).json(result);
};

export const updateFolder: AuthRequestHandler<UpdateFolderRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { id, ...data } = req.validated;
  const result = await listService.updateFolder(id, organizationId, data);

  res.json(result);
};

export const deleteFolder: AuthRequestHandler<DeleteFolderRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  await listService.deleteFolder(req.validated.id, organizationId);

  res.status(204).send();
};

export const trackFolderOpen: AuthRequestHandler<TrackOpenRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  await listService.trackFolderOpen(
    req.validated.id,
    organizationId,
    req.user.id,
  );

  res.status(204).send();
};

// ============================================
// Favorite Controllers
// ============================================

export const addFavorite: AuthRequestHandler<AddFavoriteRequest> = async (
  req,
  res,
) => {
  const result = await listService.addFavorite(
    req.user.id,
    req.validated.listId,
    req.validated.folderId,
  );

  res.status(201).json(result);
};

export const removeFavorite: AuthRequestHandler<RemoveFavoriteRequest> = async (
  req,
  res,
) => {
  await listService.removeFavorite(req.validated.id, req.user.id);

  res.status(204).send();
};

export const removeFavoriteByItem: AuthRequestHandler<AddFavoriteRequest> = async (
  req,
  res,
) => {
  await listService.removeFavoriteByItem(
    req.user.id,
    req.validated.listId,
    req.validated.folderId,
  );

  res.status(204).send();
};

export const getFavorites: AuthRequestHandler<Record<string, never>> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.getFavorites(req.user.id, organizationId);

  res.json(result);
};

// ============================================
// Recents Controllers
// ============================================

export const getRecents: AuthRequestHandler<Record<string, never>> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.getRecents(req.user.id, organizationId);

  res.json(result);
};

export const trackListOpen: AuthRequestHandler<TrackOpenRequest> = async (
  req,
  res,
) => {
  // This is handled automatically in getListDetail, but we expose it for explicit tracking
  res.status(204).send();
};

// ============================================
// Lead Controllers
// ============================================

export const updateLead: AuthRequestHandler<UpdateLeadRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { id, ...data } = req.validated;
  await listService.updateLead(id, organizationId, data);

  res.status(204).send();
};

export const getAllLeads: AuthRequestHandler<GetAllLeadsQuery> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.getAllLeads(organizationId, req.validated);

  res.json(result);
};

export const createListFromLeads: AuthRequestHandler<CreateListFromLeadsRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.createListFromLeads(
    organizationId,
    req.user.id,
    req.validated,
  );

  res.status(201).json(result);
};

export const deleteLead: AuthRequestHandler<DeleteLeadRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  await listService.deleteLead(req.validated.id, organizationId);

  res.status(204).send();
};

export const getLeadFilterOptions: AuthRequestHandler<Record<string, never>> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.getLeadFilterOptions(organizationId);

  res.json(result);
};

export const createListFromFilters: AuthRequestHandler<CreateListFromFiltersRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await listService.createListFromFilters(
    organizationId,
    req.user.id,
    req.validated,
  );

  res.status(201).json(result);
};

// ============================================
// CSV Upload Controller
// ============================================

export const uploadListCsv: AuthRequestHandler<UploadListCsvRequest> = async (
  req,
  res,
) => {
  const organizationId = req.session.activeOrganizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { id: listId } = req.validated;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const result = await listService.uploadListCsv({
      listId,
      organizationId,
      userId: req.user.id,
      file,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
};
