import { z } from "zod";

const envSchema = z.object({
  API_URL: z.url().default('http://localhost:8000/api'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Domain Configuration
  APP_DOMAIN: z.string().default('app.enrichengine.io'),
  WWW_DOMAIN: z.string().default('www.enrichengine.io'),
  // Pusher
  PUSHER_ENABLED: z.string().default('false').transform((val) => val === 'true'),
  PUSHER_KEY: z.string().default('app-key'),
  PUSHER_HOST: z.string().default('localhost'),
  PUSHER_PORT: z.coerce.number().default(6001),
  PUSHER_USE_TLS: z.string().default('false').transform((val) => val === 'true'),
  // PostHog
  POSTHOG_ENABLED: z.string().default('false').transform((val) => val === 'true'),
});

export const env = envSchema.parse({
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  WWW_DOMAIN: process.env.NEXT_PUBLIC_WWW_DOMAIN,
  PUSHER_ENABLED: process.env.NEXT_PUBLIC_PUSHER_ENABLED,
  PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  PUSHER_HOST: process.env.NEXT_PUBLIC_PUSHER_HOST,
  PUSHER_PORT: process.env.NEXT_PUBLIC_PUSHER_PORT,
  PUSHER_USE_TLS: process.env.NEXT_PUBLIC_PUSHER_USE_TLS,
  POSTHOG_ENABLED: process.env.NEXT_PUBLIC_POSTHOG_ENABLED,
});

export const ENDPOINTS = {
  USER: {
    ACCOUNT: '/user/account',
  },
  AUTH: {
    VERIFY_EMAIL: '/auth/verify-email',
    RESET_PASSWORD: '/auth/reset-password',
    FORGOT_PASSWORD: '/auth/forget-password',
    SIGN_IN: '/auth/sign-in',
    SIGN_UP: '/auth/sign-up',
    SIGN_OUT: '/auth/sign-out',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  ORGANIZATION: {
    INVITE_MEMBER: '/auth/organization/invite-member',
    CREDIT_BALANCE: (orgId: string) => `/organization/${orgId}/credit-balance`,
  },
  ADMIN: {
    STATS: '/admin/stats',
    USERS: '/admin/users',
    ORGANIZATIONS: '/admin/organizations',
    ADD_CREDITS: (organizationId: string) => `/admin/organizations/${organizationId}/credits`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/mark-read',
    MARK_ALL_READ: '/notifications/mark-all-read',
  },
  ENRICHMENT: {
    ENRICH: '/enrichment/enrich',
    HISTORY: '/enrichment/history',
    BULK: '/enrichment/bulk',
    BULK_STATUS: (jobId: string) => `/enrichment/bulk/${jobId}`,
    BULK_DOWNLOAD: (jobId: string) => `/enrichment/bulk/${jobId}/download`,
  },
  WAITLIST: {
    ADD: '/waitlist',
  },
  SCRAPE: {
    JOBS: '/scrape/jobs',
    JOB: (jobId: string) => `/scrape/jobs/${jobId}`,
    DOWNLOAD: (jobId: string) => `/scrape/jobs/${jobId}/download`,
    PAUSE: (jobId: string) => `/scrape/jobs/${jobId}/pause`,
    RESUME: (jobId: string) => `/scrape/jobs/${jobId}/resume`,
    RENAME: (jobId: string) => `/scrape/jobs/${jobId}/rename`,
    SYNC: (jobId: string) => `/scrape/jobs/${jobId}/sync`,
  },
  LISTS: {
    BASE: '/lists',
    DETAIL: (id: string) => `/lists/${id}`,
    EXPORT: (id: string) => `/lists/${id}/export`,
    UPLOAD: (id: string) => `/lists/${id}/upload`,
    OPEN: (id: string) => `/lists/${id}/open`,
    FOLDERS: '/lists/folders',
    FOLDER: (id: string) => `/lists/folders/${id}`,
    FOLDER_OPEN: (id: string) => `/lists/folders/${id}/open`,
    FAVORITES: '/lists/favorites',
    FAVORITE: (id: string) => `/lists/favorites/${id}`,
    RECENTS: '/lists/recents',
    LEAD: (id: string) => `/lists/leads/${id}`,
    ALL_LEADS: '/lists/leads',
    CREATE_LIST_FROM_LEADS: '/lists/leads/create-list',
    LEAD_FILTER_OPTIONS: '/lists/leads/filter-options',
    CREATE_LIST_FROM_FILTERS: '/lists/leads/create-list-from-filters',
  },
  ENRICH: {
    JOBS: '/enrich/jobs',
    JOB: (jobId: string) => `/enrich/jobs/${jobId}`,
    DOWNLOAD: (jobId: string) => `/enrich/jobs/${jobId}/download`,
    VENDORS: '/enrich/vendors',
    LISTS: '/enrich/lists',
    API_KEYS: '/enrich/api-keys',
    API_KEY: (vendor: string) => `/enrich/api-keys/${vendor}`,
    // Email Guess endpoints
    GUESS_PREVIEW: '/enrich/jobs/guess/preview',
    GUESS: '/enrich/jobs/guess',
    COST_BREAKDOWN: (jobId: string) => `/enrich/jobs/${jobId}/cost-breakdown`,
    COST_COMPARISON: (jobId: string) => `/enrich/jobs/${jobId}/cost-comparison`,
    PRICING_COMPARISON: '/enrich/pricing-comparison',
  },
  COPY_GENERATOR: {
    JOBS: '/copy-generator/jobs',
    JOB: (jobId: string) => `/copy-generator/jobs/${jobId}`,
    PREVIEW: '/copy-generator/preview',
    LISTS: '/copy-generator/lists',
  },
  EXTERNAL_API_KEYS: {
    LIST: '/external/api-keys',
    CREATE: '/external/api-keys',
    UPDATE: (id: string) => `/external/api-keys/${id}`,
    DELETE: (id: string) => `/external/api-keys/${id}`,
  },
  BLOG: {
    LIST: '/blog',
    DETAIL: (slug: string) => `/blog/${slug}`,
  },
  SEARCH: {
    PEOPLE: '/search/people',
  },
  VERIFICATION: {
    JOBS: '/verification/jobs',
    JOB: (jobId: string) => `/verification/jobs/${jobId}`,
    PROGRESS: (jobId: string) => `/verification/jobs/${jobId}/progress`,
    DECISION: (jobId: string) => `/verification/jobs/${jobId}/decision`,
    ESTIMATE: (jobId: string) => `/verification/jobs/${jobId}/estimate`,
  },
};

export const QUERY_KEYS = {
  organizations: () => ['organizations'] as const,
  userAccount: () => ['user', 'account'] as const,
  organizationMembers: (orgId?: string) => ['organization', 'members', orgId] as const,
  organizationInvitations: (orgId?: string) => ['organization', 'invitations', orgId] as const,
  organizationCreditBalance: (orgId?: string) => ['organization', 'credit-balance', orgId] as const,
  adminStats: () => ['admin', 'stats'] as const,
  adminUsers: () => ['admin', 'users'] as const,
  adminOrganizations: () => ['admin', 'organizations'] as const,
  adminAddCredits: (organizationId?: string) => ['admin', 'organizations', organizationId, 'credits'] as const,
  notifications: () => ['notifications'] as const,
  notificationsUnreadCount: () => ['notifications', 'unread-count'] as const,
  enrichmentHistory: () => ['enrichment', 'history'] as const,
  bulkJobStatus: (jobId?: string) => ['enrichment', 'bulk', jobId] as const,
  scrapeJobs: () => ['scrape', 'jobs'] as const,
  scrapeJob: (jobId?: string) => ['scrape', 'job', jobId] as const,
  lists: (folderId?: string | null, search?: string, ownerId?: string) =>
    ['lists', folderId, search, ownerId] as const,
  listDetail: (id?: string) => ['lists', 'detail', id] as const,
  listFavorites: () => ['lists', 'favorites'] as const,
  listRecents: () => ['lists', 'recents'] as const,
  // Leads
  allLeads: () => ['leads', 'all'] as const,
  leadFilterOptions: () => ['leads', 'filter-options'] as const,
  // Enrich
  enrichJobs: () => ['enrich', 'jobs'] as const,
  enrichJob: (jobId?: string) => ['enrich', 'job', jobId] as const,
  enrichVendors: () => ['enrich', 'vendors'] as const,
  enrichLists: () => ['enrich', 'lists'] as const,
  enrichApiKeys: () => ['enrich', 'api-keys'] as const,
  enrichGuessPreview: (listId?: string) => ['enrich', 'guess-preview', listId] as const,
  enrichCostBreakdown: (jobId?: string) => ['enrich', 'cost-breakdown', jobId] as const,
  enrichCostComparison: (jobId?: string) => ['enrich', 'cost-comparison', jobId] as const,
  pricingComparison: () => ['pricing-comparison'] as const,
  // Copy Generator
  copyGeneratorJobs: () => ['copy-generator', 'jobs'] as const,
  copyGeneratorJob: (jobId?: string) => ['copy-generator', 'job', jobId] as const,
  copyGeneratorLists: () => ['copy-generator', 'lists'] as const,
  // External API Keys
  externalApiKeys: () => ['external-api-keys'] as const,
  // Blog
  blogPosts: (category?: string) => ['blog', 'posts', category] as const,
  blogPost: (slug?: string) => ['blog', 'post', slug] as const,
  // Search
  searchPeople: () => ['search', 'people'] as const,
  // Verification
  verificationJobs: () => ['verification', 'jobs'] as const,
  verificationJob: (jobId?: string) => ['verification', 'job', jobId] as const,
  verificationProgress: (jobId?: string) => ['verification', 'progress', jobId] as const,
  verificationEstimate: (jobId?: string) => ['verification', 'estimate', jobId] as const,
};