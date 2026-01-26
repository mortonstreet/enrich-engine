import { z } from 'zod';
import { Notification } from './requests';

// ============================================
// Auth Request
// ============================================

export const PusherAuthRequestSchema = z.object({
  socket_id: z.string().min(1),
  channel_name: z.string().min(1),
});

export type PusherAuthRequest = z.infer<typeof PusherAuthRequestSchema>;

// ============================================
// Channel
// ============================================
export const privateUserChannelPrefix = 'private-user-';
export type PrivateUserChannel = `${typeof privateUserChannelPrefix}${string}`;

export const privateOrgChannelPrefix = 'private-org-';
export type PrivateOrgChannel = `${typeof privateOrgChannelPrefix}${string}`;

export const channels = {
  privateUser: (userId: string): PrivateUserChannel => `${privateUserChannelPrefix}${userId}`,
  privateOrg: (orgId: string): PrivateOrgChannel => `${privateOrgChannelPrefix}${orgId}`,
} as const;

// ============================================
// Events
// ============================================

export const PUSHER_EVENTS = {
  NOTIFICATION: 'notification',
  SCRAPE_PROGRESS: 'scrape-progress',
  ENRICHMENT_PROGRESS: 'enrichment-progress',
} as const;

export type PusherEvent = typeof PUSHER_EVENTS[keyof typeof PUSHER_EVENTS];

// ============================================
// Event Payloads
// ============================================

export interface ScrapeProgressPayload {
  jobId: string;
  status: string;
  processedRows: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
}

export interface PusherEventMap {
  [PUSHER_EVENTS.NOTIFICATION]: Notification;
  [PUSHER_EVENTS.SCRAPE_PROGRESS]: ScrapeProgressPayload;
}
