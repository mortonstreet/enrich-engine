"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Channel } from "pusher-js";
import { useSession } from "@/lib/auth-client";
import { getPusherClient, isPusherEnabled } from "@/lib/pusher-client";
import { channels, PUSHER_EVENTS, ScrapeProgressPayload } from "@shared/types/src";
import { QUERY_KEYS } from "@/lib/config";

/**
 * Hook to subscribe to real-time scrape progress updates via Pusher.
 * Updates React Query cache when progress events are received.
 */
export function useScrapeProgress() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const channelRef = useRef<Channel | null>(null);

  const handleScrapeProgress = useCallback(
    (payload: ScrapeProgressPayload) => {
      // Update the specific scrape job in React Query cache
      queryClient.setQueryData(
        QUERY_KEYS.scrapeJob(payload.jobId),
        (old: unknown) => {
          if (!old) return old;
          return {
            ...(old as object),
            status: payload.status,
            processedRows: payload.processedRows,
            totalRows: payload.totalRows,
            successCount: payload.successCount,
            errorCount: payload.errorCount,
          };
        }
      );

      // Also invalidate jobs list if status changed to completed/failed
      if (payload.status === "completed" || payload.status === "failed") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
        // Also invalidate role analytics when job completes
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeRoleAnalytics(payload.jobId) });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    // Skip if Pusher is disabled
    if (!isPusherEnabled()) return;

    const orgId = session?.session?.activeOrganizationId;

    if (!orgId) {
      // No org - disconnect if connected
      if (channelRef.current) {
        channelRef.current.unbind_all();
        const pusher = getPusherClient();
        if (pusher) {
          pusher.unsubscribe(channelRef.current.name);
        }
        channelRef.current = null;
      }
      return;
    }

    // Connect and subscribe to org's private channel
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = channels.privateOrg(orgId);

    // Check if already subscribed to this channel
    if (channelRef.current?.name === channelName) {
      return;
    }

    // Unsubscribe from previous channel if different
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    // Subscribe to private org channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Bind to scrape progress events
    channel.bind(PUSHER_EVENTS.SCRAPE_PROGRESS, handleScrapeProgress);

    // Cleanup on unmount or org change
    return () => {
      channel.unbind(PUSHER_EVENTS.SCRAPE_PROGRESS, handleScrapeProgress);
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [session?.session?.activeOrganizationId, handleScrapeProgress]);

  return { isConnected: isPusherEnabled() && !!session?.session?.activeOrganizationId };
}
