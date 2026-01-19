"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDownloadData = exports.renameScrapeJob = exports.syncScrapeJobToList = exports.createResultList = exports.createOrUpdateResultList = exports.updateJobProgress = exports.processScrapeJob = exports.resumeScrapeJob = exports.pauseScrapeJob = exports.deleteScrapeJob = exports.getScrapeJob = exports.getScrapeJobs = exports.createScrapeJob = exports.validateCSVColumns = void 0;
var scrapeJobRepository = require("@/repositories/scrapeJob.repository");
var listRepository = require("@/repositories/list.repository");
var leadRepository = require("@/repositories/lead.repository");
var serperClient = require("@/clients/serper.client");
var src_1 = require("@shared/types/src");
var logger_1 = require("@/lib/logger");
var NAME_REQUIRED_COLUMNS = ["first_name", "last_name"];
var ROLE_COLUMNS = ["role", "role1", "role2", "role3"];
var getRolesFromRow = function (row) {
    var _a, _b, _c, _d;
    var roles = [];
    if ((_a = row.role) === null || _a === void 0 ? void 0 : _a.trim())
        roles.push(row.role.trim());
    if ((_b = row.role1) === null || _b === void 0 ? void 0 : _b.trim())
        roles.push(row.role1.trim());
    if ((_c = row.role2) === null || _c === void 0 ? void 0 : _c.trim())
        roles.push(row.role2.trim());
    if ((_d = row.role3) === null || _d === void 0 ? void 0 : _d.trim())
        roles.push(row.role3.trim());
    return roles;
};
// Generate a unique key for deduplication based on input type
var getDedupeKey = function (inputData, inputType) {
    if (inputType === src_1.ScrapeInputType.ROLE) {
        // For role-based: company + role combination
        var company = (inputData.company || "").toLowerCase().trim();
        var role = (inputData.role || "").toLowerCase().trim();
        return "".concat(company, "|").concat(role);
    }
    else {
        // For name-based: first_name + last_name + company combination
        var firstName = (inputData.first_name || "").toLowerCase().trim();
        var lastName = (inputData.last_name || "").toLowerCase().trim();
        var company = (inputData.company || "").toLowerCase().trim();
        return "".concat(firstName, "|").concat(lastName, "|").concat(company);
    }
};
var validateCSVColumns = function (columns) {
    var normalizedColumns = columns.map(function (c) { return c.toLowerCase().trim(); });
    var hasNameColumns = NAME_REQUIRED_COLUMNS.every(function (col) {
        return normalizedColumns.includes(col);
    });
    var hasRoleColumns = normalizedColumns.includes("company") &&
        ROLE_COLUMNS.some(function (col) { return normalizedColumns.includes(col); });
    if (hasNameColumns) {
        return {
            isValid: true,
            inputType: src_1.ScrapeInputType.NAME,
            columns: normalizedColumns,
            missingColumns: [],
            errors: [],
        };
    }
    if (hasRoleColumns) {
        return {
            isValid: true,
            inputType: src_1.ScrapeInputType.ROLE,
            columns: normalizedColumns,
            missingColumns: [],
            errors: [],
        };
    }
    var missingNameCols = NAME_REQUIRED_COLUMNS.filter(function (col) { return !normalizedColumns.includes(col); });
    var missingRoleCols = [];
    if (!normalizedColumns.includes("company")) {
        missingRoleCols.push("company");
    }
    if (!ROLE_COLUMNS.some(function (col) { return normalizedColumns.includes(col); })) {
        missingRoleCols.push("role (or role1/role2/role3)");
    }
    return {
        isValid: false,
        inputType: null,
        columns: normalizedColumns,
        missingColumns: __spreadArray([], new Set(__spreadArray(__spreadArray([], missingNameCols, true), missingRoleCols, true)), true),
        errors: [
            "Missing required columns. For name-based search: ".concat(NAME_REQUIRED_COLUMNS.join(", "), ". For role-based search: company + role (or role1/role2/role3)."),
        ],
    };
};
exports.validateCSVColumns = validateCSVColumns;
var createScrapeJob = function (organizationId, userId, name, inputType, rows) { return __awaiter(void 0, void 0, void 0, function () {
    var job, items, seenKeys;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.create({
                    organizationId: organizationId,
                    userId: userId,
                    name: name,
                    totalRows: rows.length,
                    inputType: inputType,
                    status: src_1.ScrapeJobStatus.PENDING,
                })];
            case 1:
                job = _a.sent();
                if (!job) {
                    throw new Error("Failed to create scrape job");
                }
                items = [];
                seenKeys = new Set();
                if (inputType === src_1.ScrapeInputType.ROLE) {
                    rows.forEach(function (row) {
                        var roles = getRolesFromRow(row);
                        roles.forEach(function (role) {
                            var inputData = __assign(__assign({}, row), { role: role });
                            var dedupeKey = getDedupeKey(inputData, inputType);
                            // Skip if we've already seen this company+role combination
                            if (seenKeys.has(dedupeKey)) {
                                return;
                            }
                            seenKeys.add(dedupeKey);
                            items.push({
                                jobId: job.id,
                                rowIndex: items.length,
                                inputData: inputData,
                                status: src_1.ScrapeItemStatus.PENDING,
                            });
                        });
                    });
                }
                else {
                    rows.forEach(function (row) {
                        var inputData = row;
                        var dedupeKey = getDedupeKey(inputData, inputType);
                        // Skip if we've already seen this name+company combination
                        if (seenKeys.has(dedupeKey)) {
                            return;
                        }
                        seenKeys.add(dedupeKey);
                        items.push({
                            jobId: job.id,
                            rowIndex: items.length,
                            inputData: inputData,
                            status: src_1.ScrapeItemStatus.PENDING,
                        });
                    });
                }
                return [4 /*yield*/, scrapeJobRepository.createItems(items)];
            case 2:
                _a.sent();
                if (!(items.length !== rows.length)) return [3 /*break*/, 4];
                return [4 /*yield*/, scrapeJobRepository.update(job.id, { totalRows: items.length })];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                logger_1.default.info({ jobId: job.id, totalRows: items.length, inputType: inputType }, "Scrape job created");
                return [2 /*return*/, {
                        job: __assign(__assign({}, job), { totalRows: items.length }),
                        message: "Scrape job created with ".concat(items.length, " items"),
                    }];
        }
    });
}); };
exports.createScrapeJob = createScrapeJob;
var getScrapeJobs = function (organizationId, params) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, scrapeJobRepository.findByOrganizationId(organizationId, {
                page: params.page,
                limit: params.limit,
                status: params.status,
            })];
    });
}); };
exports.getScrapeJobs = getScrapeJobs;
var getScrapeJob = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, items;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findByIdWithItems(jobId)];
            case 1:
                _a = _b.sent(), job = _a.job, items = _a.items;
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                return [2 /*return*/, __assign(__assign({}, job), { items: items })];
        }
    });
}); };
exports.getScrapeJob = getScrapeJob;
var deleteScrapeJob = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var job;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _a.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                if (job.status === src_1.ScrapeJobStatus.PROCESSING) {
                    throw new Error("Cannot delete a job that is currently processing");
                }
                return [4 /*yield*/, scrapeJobRepository.deleteById(jobId)];
            case 2:
                _a.sent();
                return [2 /*return*/, {
                        success: true,
                        message: "Scrape job deleted successfully",
                    }];
        }
    });
}); };
exports.deleteScrapeJob = deleteScrapeJob;
var pauseScrapeJob = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var job, updatedJob;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _a.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                if (job.status !== src_1.ScrapeJobStatus.PROCESSING && job.status !== src_1.ScrapeJobStatus.PENDING) {
                    throw new Error("Can only pause pending or processing jobs");
                }
                return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                        status: src_1.ScrapeJobStatus.PAUSED,
                    })];
            case 2:
                updatedJob = _a.sent();
                // Reset any items that were in processing state back to pending
                return [4 /*yield*/, scrapeJobRepository.resetStuckItems(jobId)];
            case 3:
                // Reset any items that were in processing state back to pending
                _a.sent();
                // Create/update the result list so partially scraped leads are available for enrichment
                return [4 /*yield*/, (0, exports.createOrUpdateResultList)(jobId)];
            case 4:
                // Create/update the result list so partially scraped leads are available for enrichment
                _a.sent();
                logger_1.default.info({ jobId: jobId }, "Scrape job paused");
                return [2 /*return*/, updatedJob];
        }
    });
}); };
exports.pauseScrapeJob = pauseScrapeJob;
var resumeScrapeJob = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var job, updatedJob;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _a.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                if (job.status !== src_1.ScrapeJobStatus.PAUSED) {
                    throw new Error("Can only resume paused jobs");
                }
                return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                        status: src_1.ScrapeJobStatus.PENDING,
                    })];
            case 2:
                updatedJob = _a.sent();
                logger_1.default.info({ jobId: jobId }, "Scrape job resumed");
                return [2 /*return*/, updatedJob];
        }
    });
}); };
exports.resumeScrapeJob = resumeScrapeJob;
// How often to sync results to the list (every N items)
var LIST_SYNC_INTERVAL = 50;
var processScrapeJob = function (jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var job, items, processedSinceLastSync, _i, items_1, item, currentJob, inputData, query, _a, linkedinUrl, rawResponse, error_1, error_2, syncError_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _b.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                        status: src_1.ScrapeJobStatus.PROCESSING,
                    })];
            case 2:
                _b.sent();
                logger_1.default.info({ jobId: jobId }, "Starting scrape job processing");
                _b.label = 3;
            case 3:
                _b.trys.push([3, 23, , 30]);
                // Reset any items stuck in 'processing' status from a previous failed/interrupted run
                return [4 /*yield*/, scrapeJobRepository.resetStuckItems(jobId)];
            case 4:
                // Reset any items stuck in 'processing' status from a previous failed/interrupted run
                _b.sent();
                return [4 /*yield*/, scrapeJobRepository.findPendingItems(jobId)];
            case 5:
                items = _b.sent();
                processedSinceLastSync = 0;
                _i = 0, items_1 = items;
                _b.label = 6;
            case 6:
                if (!(_i < items_1.length)) return [3 /*break*/, 20];
                item = items_1[_i];
                return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 7:
                currentJob = _b.sent();
                if ((currentJob === null || currentJob === void 0 ? void 0 : currentJob.status) === src_1.ScrapeJobStatus.PAUSED) {
                    logger_1.default.info({ jobId: jobId }, "Scrape job paused, stopping processing");
                    return [2 /*return*/]; // Exit without marking as completed or failed
                }
                _b.label = 8;
            case 8:
                _b.trys.push([8, 16, , 19]);
                return [4 /*yield*/, scrapeJobRepository.updateItem(item.id, {
                        status: src_1.ScrapeItemStatus.PROCESSING,
                    })];
            case 9:
                _b.sent();
                inputData = item.inputData;
                query = void 0;
                if (job.inputType === src_1.ScrapeInputType.NAME) {
                    query = serperClient.buildNameQuery(inputData.first_name || "", inputData.last_name || "", inputData.company);
                }
                else {
                    query = serperClient.buildRoleQuery(inputData.company || "", inputData.role || "");
                }
                return [4 /*yield*/, serperClient.searchLinkedIn(query)];
            case 10:
                _a = _b.sent(), linkedinUrl = _a.linkedinUrl, rawResponse = _a.rawResponse;
                return [4 /*yield*/, scrapeJobRepository.updateItem(item.id, {
                        status: linkedinUrl ? src_1.ScrapeItemStatus.COMPLETED : src_1.ScrapeItemStatus.NO_RESULT,
                        linkedinUrl: linkedinUrl,
                        serperResponse: rawResponse,
                        processedAt: new Date(),
                    })];
            case 11:
                _b.sent();
                return [4 /*yield*/, (0, exports.updateJobProgress)(jobId)];
            case 12:
                _b.sent();
                processedSinceLastSync++;
                if (!(processedSinceLastSync >= LIST_SYNC_INTERVAL)) return [3 /*break*/, 14];
                return [4 /*yield*/, (0, exports.createOrUpdateResultList)(jobId)];
            case 13:
                _b.sent();
                processedSinceLastSync = 0;
                _b.label = 14;
            case 14: 
            // Rate limiting
            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
            case 15:
                // Rate limiting
                _b.sent();
                return [3 /*break*/, 19];
            case 16:
                error_1 = _b.sent();
                logger_1.default.error({ error: error_1, itemId: item.id }, "Failed to process scrape item");
                return [4 /*yield*/, scrapeJobRepository.updateItem(item.id, {
                        status: src_1.ScrapeItemStatus.FAILED,
                        errorMessage: error_1 instanceof Error ? error_1.message : "Unknown error",
                        processedAt: new Date(),
                    })];
            case 17:
                _b.sent();
                return [4 /*yield*/, (0, exports.updateJobProgress)(jobId)];
            case 18:
                _b.sent();
                processedSinceLastSync++;
                return [3 /*break*/, 19];
            case 19:
                _i++;
                return [3 /*break*/, 6];
            case 20: 
            // Final sync to ensure all results are in the list
            return [4 /*yield*/, (0, exports.createResultList)(jobId)];
            case 21:
                // Final sync to ensure all results are in the list
                _b.sent();
                return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                        status: src_1.ScrapeJobStatus.COMPLETED,
                        completedAt: new Date(),
                    })];
            case 22:
                _b.sent();
                logger_1.default.info({ jobId: jobId }, "Scrape job completed");
                return [3 /*break*/, 30];
            case 23:
                error_2 = _b.sent();
                logger_1.default.error({ error: error_2, jobId: jobId }, "Scrape job failed");
                // Mark any items stuck in 'processing' as failed
                return [4 /*yield*/, scrapeJobRepository.failStuckItems(jobId)];
            case 24:
                // Mark any items stuck in 'processing' as failed
                _b.sent();
                _b.label = 25;
            case 25:
                _b.trys.push([25, 27, , 28]);
                return [4 /*yield*/, (0, exports.createOrUpdateResultList)(jobId)];
            case 26:
                _b.sent();
                return [3 /*break*/, 28];
            case 27:
                syncError_1 = _b.sent();
                logger_1.default.error({ error: syncError_1, jobId: jobId }, "Failed to sync results before marking job as failed");
                return [3 /*break*/, 28];
            case 28: return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                    status: src_1.ScrapeJobStatus.FAILED,
                    completedAt: new Date(),
                })];
            case 29:
                _b.sent();
                throw error_2;
            case 30: return [2 /*return*/];
        }
    });
}); };
exports.processScrapeJob = processScrapeJob;
var updateJobProgress = function (jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var progress;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.getJobProgress(jobId)];
            case 1:
                progress = _a.sent();
                return [2 /*return*/, scrapeJobRepository.update(jobId, {
                        processedRows: progress.processedRows,
                        successCount: progress.successCount,
                        errorCount: progress.errorCount,
                    })];
        }
    });
}); };
exports.updateJobProgress = updateJobProgress;
var createOrUpdateResultList = function (jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, items, successfulItems, list, _b, existingLeads, existingLinkedinUrls, seenLinkedinUrls, newLeads, _i, successfulItems_1, item, linkedinUrl, inputData, actualLeadCount;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findByIdWithItems(jobId)];
            case 1:
                _a = _c.sent(), job = _a.job, items = _a.items;
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                successfulItems = items.filter(function (item) { return item.status === src_1.ScrapeItemStatus.COMPLETED && item.linkedinUrl; });
                if (successfulItems.length === 0) {
                    logger_1.default.info({ jobId: jobId }, "No successful results to create/update list");
                    return [2 /*return*/];
                }
                if (!job.resultListId) return [3 /*break*/, 3];
                return [4 /*yield*/, listRepository.findListById(job.resultListId)];
            case 2:
                _b = _c.sent();
                return [3 /*break*/, 4];
            case 3:
                _b = undefined;
                _c.label = 4;
            case 4:
                list = _b;
                if (!!list) return [3 /*break*/, 7];
                return [4 /*yield*/, listRepository.createList({
                        organizationId: job.organizationId,
                        createdById: job.userId,
                        name: job.name,
                        source: "scraped",
                        scrapeJobId: job.id,
                    })];
            case 5:
                // Create a new list
                list = _c.sent();
                if (!list) {
                    throw new Error("Failed to create result list");
                }
                return [4 /*yield*/, scrapeJobRepository.update(jobId, {
                        resultListId: list.id,
                    })];
            case 6:
                _c.sent();
                _c.label = 7;
            case 7: return [4 /*yield*/, leadRepository.findAllByListId(list.id)];
            case 8:
                existingLeads = _c.sent();
                existingLinkedinUrls = new Set(existingLeads
                    .filter(function (l) { return l.linkedinUrl; })
                    .map(function (l) { return l.linkedinUrl.toLowerCase().trim(); }));
                seenLinkedinUrls = new Set(existingLinkedinUrls);
                newLeads = [];
                for (_i = 0, successfulItems_1 = successfulItems; _i < successfulItems_1.length; _i++) {
                    item = successfulItems_1[_i];
                    linkedinUrl = item.linkedinUrl.toLowerCase().trim();
                    // Skip if we've already seen this LinkedIn URL
                    if (seenLinkedinUrls.has(linkedinUrl)) {
                        continue;
                    }
                    seenLinkedinUrls.add(linkedinUrl);
                    inputData = item.inputData;
                    newLeads.push({
                        listId: list.id,
                        organizationId: job.organizationId,
                        firstName: inputData.first_name,
                        lastName: inputData.last_name,
                        company: inputData.company,
                        role: inputData.role,
                        linkedinUrl: item.linkedinUrl,
                    });
                }
                if (!(newLeads.length > 0)) return [3 /*break*/, 10];
                return [4 /*yield*/, listRepository.createLeads(newLeads)];
            case 9:
                _c.sent();
                _c.label = 10;
            case 10: return [4 /*yield*/, leadRepository.countByListId(list.id)];
            case 11:
                actualLeadCount = _c.sent();
                return [4 /*yield*/, listRepository.updateList(list.id, {
                        leadCount: actualLeadCount,
                        importStatus: "completed",
                    })];
            case 12:
                _c.sent();
                logger_1.default.info({ jobId: jobId, listId: list.id, newLeadsCount: newLeads.length, totalLeadCount: actualLeadCount }, "Created/updated result list from scrape job");
                return [2 /*return*/];
        }
    });
}); };
exports.createOrUpdateResultList = createOrUpdateResultList;
// Backwards compatibility alias
exports.createResultList = exports.createOrUpdateResultList;
var syncScrapeJobToList = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var job, items, successfulItems, updatedJob;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _b.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                return [4 /*yield*/, scrapeJobRepository.findByIdWithItems(jobId)];
            case 2:
                items = (_b.sent()).items;
                successfulItems = items.filter(function (item) { return item.status === src_1.ScrapeItemStatus.COMPLETED && item.linkedinUrl; });
                if (successfulItems.length === 0) {
                    return [2 /*return*/, {
                            success: false,
                            listId: null,
                            leadsCount: 0,
                            message: "No successful results to sync",
                        }];
                }
                // Create or update the list
                return [4 /*yield*/, (0, exports.createOrUpdateResultList)(jobId)];
            case 3:
                // Create or update the list
                _b.sent();
                return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 4:
                updatedJob = _b.sent();
                logger_1.default.info({ jobId: jobId, listId: updatedJob === null || updatedJob === void 0 ? void 0 : updatedJob.resultListId, leadsCount: successfulItems.length }, "Scrape job results synced to list");
                return [2 /*return*/, {
                        success: true,
                        listId: (_a = updatedJob === null || updatedJob === void 0 ? void 0 : updatedJob.resultListId) !== null && _a !== void 0 ? _a : null,
                        leadsCount: successfulItems.length,
                        message: "Synced ".concat(successfulItems.length, " leads to list"),
                    }];
        }
    });
}); };
exports.syncScrapeJobToList = syncScrapeJobToList;
var renameScrapeJob = function (jobId, organizationId, name) { return __awaiter(void 0, void 0, void 0, function () {
    var job, updatedJob;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findById(jobId)];
            case 1:
                job = _a.sent();
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                return [4 /*yield*/, scrapeJobRepository.update(jobId, { name: name })];
            case 2:
                updatedJob = _a.sent();
                if (!updatedJob) {
                    throw new Error("Failed to rename scrape job");
                }
                if (!job.resultListId) return [3 /*break*/, 4];
                return [4 /*yield*/, listRepository.updateList(job.resultListId, { name: name })];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                logger_1.default.info({ jobId: jobId, name: name }, "Scrape job renamed");
                return [2 /*return*/, updatedJob];
        }
    });
}); };
exports.renameScrapeJob = renameScrapeJob;
var getDownloadData = function (jobId, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, items, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, scrapeJobRepository.findByIdWithItems(jobId)];
            case 1:
                _a = _b.sent(), job = _a.job, items = _a.items;
                if (!job) {
                    throw new Error("Scrape job not found");
                }
                if (job.organizationId !== organizationId) {
                    throw new Error("Unauthorized access to scrape job");
                }
                rows = items.map(function (item) {
                    var inputData = item.inputData;
                    return __assign(__assign({}, inputData), { linkedin_url: item.linkedinUrl || "", status: item.status });
                });
                return [2 /*return*/, {
                        fileName: "".concat(job.name.replace(/[^a-zA-Z0-9]/g, "_"), "_results.csv"),
                        rows: rows,
                    }];
        }
    });
}); };
exports.getDownloadData = getDownloadData;
