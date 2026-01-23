import { Selectable, Insertable, Updateable } from "kysely";
import {
  User,
  Example,
  Organization,
  Session,
  Account,
  Notification,
  Enrichment,
  BulkEnrichmentJob,
  BulkEnrichmentItem,
  Waitlist,
  ScrapeJob,
  ScrapeJobItem,
  LeadList,
  LeadListFolder,
  ListFavorite,
  ListOpen,
  Lead,
  BlogPost,
} from "./generated/types";


export type DBUser = Selectable<User>;
export type UpdateDBUser = Updateable<User>;
export type InsertDBUser = Insertable<User>;

export type DBAccount = Selectable<Account>;
export type UpdateDBAccount = Updateable<Account>;
export type InsertDBAccount = Insertable<Account>;

export type DBSession = Selectable<Session>;
export type UpdateDBSession = Updateable<Session>;
export type InsertDBSession = Insertable<Session>;

export type DBOrganization = Selectable<Organization>;
export type InsertDBOrganization = Insertable<Organization>;
export type UpdateDBOrganization = Updateable<Organization>;

export type DBExample = Selectable<Example>;
export type UpdateDBExample = Updateable<Example>;
export type InsertDBExample = Insertable<Example>;

export type DBNotification = Selectable<Notification>;
export type UpdateDBNotification = Updateable<Notification>;
export type InsertDBNotification = Insertable<Notification>;
export type CreateNotificationInput = Omit<DBNotification, 'id' | 'createdAt' | 'updatedAt'>;

// Enrichment types
export type DBEnrichment = Selectable<Enrichment>;
export type UpdateDBEnrichment = Updateable<Enrichment>;
export type InsertDBEnrichment = Insertable<Enrichment>;
export type CreateEnrichmentInput = Omit<DBEnrichment, 'id' | 'createdAt' | 'updatedAt'>;

export type DBBulkEnrichmentJob = Selectable<BulkEnrichmentJob>;
export type UpdateDBBulkEnrichmentJob = Updateable<BulkEnrichmentJob>;
export type InsertDBBulkEnrichmentJob = Insertable<BulkEnrichmentJob>;
export type CreateBulkEnrichmentJobInput = Omit<DBBulkEnrichmentJob, 'id' | 'createdAt' | 'updatedAt'>;

export type DBBulkEnrichmentItem = Selectable<BulkEnrichmentItem>;
export type UpdateDBBulkEnrichmentItem = Updateable<BulkEnrichmentItem>;
export type InsertDBBulkEnrichmentItem = Insertable<BulkEnrichmentItem>;
export type CreateBulkEnrichmentItemInput = Omit<DBBulkEnrichmentItem, 'id' | 'createdAt' | 'updatedAt'>;

export type DBWaitlist = Selectable<Waitlist>;
export type InsertDBWaitlist = Insertable<Waitlist>;
export type CreateWaitlistInput = Omit<DBWaitlist, 'id' | 'createdAt'>;

// Scrape job types
export type DBScrapeJob = Selectable<ScrapeJob>;
export type UpdateDBScrapeJob = Updateable<ScrapeJob>;
export type InsertDBScrapeJob = Insertable<ScrapeJob>;
export type CreateScrapeJobInput = Omit<DBScrapeJob, 'id' | 'createdAt' | 'updatedAt'>;

export type DBScrapeJobItem = Selectable<ScrapeJobItem>;
export type UpdateDBScrapeJobItem = Updateable<ScrapeJobItem>;
export type InsertDBScrapeJobItem = Insertable<ScrapeJobItem>;
export type CreateScrapeJobItemInput = Omit<DBScrapeJobItem, 'id' | 'createdAt'>;

export type DBPagination = {
  page: number;
  limit: number;
  offset: number;
};

// List types
export type DBLeadList = Selectable<LeadList>;
export type UpdateDBLeadList = Updateable<LeadList>;
export type InsertDBLeadList = Insertable<LeadList>;
export type CreateLeadListInput = Omit<DBLeadList, 'id' | 'createdAt' | 'updatedAt'>;

export type DBLeadListFolder = Selectable<LeadListFolder>;
export type UpdateDBLeadListFolder = Updateable<LeadListFolder>;
export type InsertDBLeadListFolder = Insertable<LeadListFolder>;
export type CreateLeadListFolderInput = Omit<DBLeadListFolder, 'id' | 'createdAt' | 'updatedAt'>;

export type DBListFavorite = Selectable<ListFavorite>;
export type InsertDBListFavorite = Insertable<ListFavorite>;
export type CreateListFavoriteInput = Omit<DBListFavorite, 'id' | 'createdAt'>;

export type DBListOpen = Selectable<ListOpen>;
export type InsertDBListOpen = Insertable<ListOpen>;
export type CreateListOpenInput = Omit<DBListOpen, 'id' | 'openedAt'>;

export type DBLead = Selectable<Lead>;
export type UpdateDBLead = Updateable<Lead>;
export type InsertDBLead = Insertable<Lead>;
export type CreateLeadInput = Omit<DBLead, 'id' | 'createdAt' | 'updatedAt'>;

// Blog types
export type DBBlogPost = Selectable<BlogPost>;
export type UpdateDBBlogPost = Updateable<BlogPost>;
export type InsertDBBlogPost = Insertable<BlogPost>;
export type CreateBlogPostInput = Omit<DBBlogPost, 'id' | 'createdAt' | 'updatedAt'>;