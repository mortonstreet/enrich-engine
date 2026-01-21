import { Router } from "express";
import {
  createList,
  updateList,
  deleteList,
  getLists,
  getListDetail,
  exportList,
  uploadListCsv,
  createFolder,
  updateFolder,
  deleteFolder,
  trackFolderOpen,
  addFavorite,
  removeFavorite,
  removeFavoriteByItem,
  getFavorites,
  getRecents,
  trackListOpen,
  updateLead,
  getAllLeads,
  createListFromLeads,
  createListFromFilters,
  getLeadFilterOptions,
  deleteLead,
} from "@/api/controllers/list.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  CreateListRequest,
  CreateListRequestSchema,
  UpdateListRequest,
  UpdateListRequestSchema,
  GetListRequest,
  GetListRequestSchema,
  DeleteListRequest,
  DeleteListRequestSchema,
  CreateFolderRequest,
  CreateFolderRequestSchema,
  UpdateFolderRequest,
  UpdateFolderRequestSchema,
  DeleteFolderRequest,
  DeleteFolderRequestSchema,
  AddFavoriteRequest,
  AddFavoriteRequestSchema,
  RemoveFavoriteRequest,
  RemoveFavoriteRequestSchema,
  GetListsQuery,
  GetListsQuerySchema,
  GetLeadsQuery,
  GetLeadsQuerySchema,
  GetAllLeadsQuery,
  GetAllLeadsQuerySchema,
  CreateListFromLeadsRequest,
  CreateListFromLeadsRequestSchema,
  CreateListFromFiltersRequest,
  CreateListFromFiltersRequestSchema,
  DeleteLeadRequest,
  DeleteLeadRequestSchema,
  TrackOpenRequest,
  TrackOpenRequestSchema,
  UpdateLeadRequest,
  UpdateLeadRequestSchema,
  UploadListCsvRequest,
  UploadListCsvRequestSchema,
} from "@shared/types/src";
import multer from "multer";

const router = Router();

// Configure multer for CSV uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// ============================================
// IMPORTANT: Static routes MUST come before dynamic /:id routes
// Express matches routes in order, so /leads must be before /:id
// ============================================

// ============================================
// Root List Routes (no parameters)
// ============================================

// Get all lists and folders
router.get(
  "/",
  withBetterAuth,
  validateAndMerge(GetListsQuerySchema),
  authenticatedRoute<GetListsQuery>(getLists),
);

// Create a new list
router.post(
  "/",
  withBetterAuth,
  validateAndMerge(CreateListRequestSchema),
  authenticatedRoute<CreateListRequest>(createList),
);

// ============================================
// Lead Routes (static paths - must be before /:id)
// ============================================

// Get all leads across all lists
router.get(
  "/leads",
  withBetterAuth,
  validateAndMerge(GetAllLeadsQuerySchema),
  authenticatedRoute<GetAllLeadsQuery>(getAllLeads),
);

// Get filter options for lead filtering UI
router.get(
  "/leads/filter-options",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getLeadFilterOptions),
);

// Create a new list from selected leads
router.post(
  "/leads/create-list",
  withBetterAuth,
  validateAndMerge(CreateListFromLeadsRequestSchema),
  authenticatedRoute<CreateListFromLeadsRequest>(createListFromLeads),
);

// Create a new list from filters (targeted list building)
router.post(
  "/leads/create-list-from-filters",
  withBetterAuth,
  validateAndMerge(CreateListFromFiltersRequestSchema),
  authenticatedRoute<CreateListFromFiltersRequest>(createListFromFilters),
);

// ============================================
// Folder Routes (static path - must be before /:id)
// ============================================

// Create a folder
router.post(
  "/folders",
  withBetterAuth,
  validateAndMerge(CreateFolderRequestSchema),
  authenticatedRoute<CreateFolderRequest>(createFolder),
);

// ============================================
// Favorite Routes (static path - must be before /:id)
// ============================================

// Get user's favorites
router.get(
  "/favorites",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getFavorites),
);

// Add to favorites
router.post(
  "/favorites",
  withBetterAuth,
  validateAndMerge(AddFavoriteRequestSchema),
  authenticatedRoute<AddFavoriteRequest>(addFavorite),
);

// Remove from favorites by item (list or folder) - DELETE with query params
router.delete(
  "/favorites",
  withBetterAuth,
  validateAndMerge(AddFavoriteRequestSchema),
  authenticatedRoute<AddFavoriteRequest>(removeFavoriteByItem),
);

// ============================================
// Recents Routes (static path - must be before /:id)
// ============================================

// Get user's recently opened items
router.get(
  "/recents",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getRecents),
);

// ============================================
// Dynamic Routes with Parameters
// ============================================

// Lead routes with :id parameter
router.patch(
  "/leads/:id",
  withBetterAuth,
  validateAndMerge(UpdateLeadRequestSchema),
  authenticatedRoute<UpdateLeadRequest>(updateLead),
);

router.delete(
  "/leads/:id",
  withBetterAuth,
  validateAndMerge(DeleteLeadRequestSchema),
  authenticatedRoute<DeleteLeadRequest>(deleteLead),
);

// Folder routes with :id parameter
router.patch(
  "/folders/:id",
  withBetterAuth,
  validateAndMerge(UpdateFolderRequestSchema),
  authenticatedRoute<UpdateFolderRequest>(updateFolder),
);

router.delete(
  "/folders/:id",
  withBetterAuth,
  validateAndMerge(DeleteFolderRequestSchema),
  authenticatedRoute<DeleteFolderRequest>(deleteFolder),
);

router.post(
  "/folders/:id/open",
  withBetterAuth,
  validateAndMerge(TrackOpenRequestSchema),
  authenticatedRoute<TrackOpenRequest>(trackFolderOpen),
);

// Favorites route with :id parameter
router.delete(
  "/favorites/:id",
  withBetterAuth,
  validateAndMerge(RemoveFavoriteRequestSchema),
  authenticatedRoute<RemoveFavoriteRequest>(removeFavorite),
);

// ============================================
// List Routes with :id parameter (MUST BE LAST)
// These catch-all routes must be after all static routes
// ============================================

// Get list detail with leads
router.get(
  "/:id",
  withBetterAuth,
  validateAndMerge(GetLeadsQuerySchema),
  authenticatedRoute<GetLeadsQuery>(getListDetail),
);

// Update a list
router.patch(
  "/:id",
  withBetterAuth,
  validateAndMerge(UpdateListRequestSchema),
  authenticatedRoute<UpdateListRequest>(updateList),
);

// Delete a list
router.delete(
  "/:id",
  withBetterAuth,
  validateAndMerge(DeleteListRequestSchema),
  authenticatedRoute<DeleteListRequest>(deleteList),
);

// Export list as CSV
router.get(
  "/:id/export",
  withBetterAuth,
  validateAndMerge(GetListRequestSchema),
  authenticatedRoute<GetListRequest>(exportList),
);

// Upload CSV to list
router.post(
  "/:id/upload",
  withBetterAuth,
  upload.single("file"),
  validateAndMerge(UploadListCsvRequestSchema),
  authenticatedRoute<UploadListCsvRequest>(uploadListCsv),
);

// Track list open
router.post(
  "/:id/open",
  withBetterAuth,
  validateAndMerge(TrackOpenRequestSchema),
  authenticatedRoute<TrackOpenRequest>(trackListOpen),
);

export default router;
