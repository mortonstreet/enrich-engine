// backend/src/lib/httpAgent.ts

import https from 'https';
import http from 'http';

export interface HttpAgentOptions {
  maxSockets?: number;
  maxFreeSockets?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: HttpAgentOptions = {
  maxSockets: 100, // Max concurrent connections per host
  maxFreeSockets: 20, // Keep 20 connections warm
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 second keep-alive
  timeout: 30000, // 30 second timeout
};

// Singleton agents
let httpsAgent: https.Agent | null = null;
let httpAgent: http.Agent | null = null;

/**
 * Gets the HTTPS agent with connection pooling
 */
export function getHttpsAgent(options?: HttpAgentOptions): https.Agent {
  if (httpsAgent) {
    return httpsAgent;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  httpsAgent = new https.Agent({
    maxSockets: opts.maxSockets,
    maxFreeSockets: opts.maxFreeSockets,
    keepAlive: opts.keepAlive,
    keepAliveMsecs: opts.keepAliveMsecs,
    timeout: opts.timeout,
  });

  return httpsAgent;
}

/**
 * Gets the HTTP agent with connection pooling
 */
export function getHttpAgent(options?: HttpAgentOptions): http.Agent {
  if (httpAgent) {
    return httpAgent;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  httpAgent = new http.Agent({
    maxSockets: opts.maxSockets,
    maxFreeSockets: opts.maxFreeSockets,
    keepAlive: opts.keepAlive,
    keepAliveMsecs: opts.keepAliveMsecs,
    timeout: opts.timeout,
  });

  return httpAgent;
}

/**
 * Gets agent stats for monitoring
 */
export function getAgentStats(): {
  https: { sockets: number; freeSockets: number; requests: number };
  http: { sockets: number; freeSockets: number; requests: number };
} {
  const countSockets = (obj: NodeJS.ReadOnlyDict<unknown[]> | undefined): number => {
    if (!obj) return 0;
    return Object.values(obj).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
  };

  return {
    https: {
      sockets: countSockets(httpsAgent?.sockets as NodeJS.ReadOnlyDict<unknown[]> | undefined),
      freeSockets: countSockets(httpsAgent?.freeSockets as NodeJS.ReadOnlyDict<unknown[]> | undefined),
      requests: countSockets(httpsAgent?.requests as NodeJS.ReadOnlyDict<unknown[]> | undefined),
    },
    http: {
      sockets: countSockets(httpAgent?.sockets as NodeJS.ReadOnlyDict<unknown[]> | undefined),
      freeSockets: countSockets(httpAgent?.freeSockets as NodeJS.ReadOnlyDict<unknown[]> | undefined),
      requests: countSockets(httpAgent?.requests as NodeJS.ReadOnlyDict<unknown[]> | undefined),
    },
  };
}

/**
 * Destroys all agents (for graceful shutdown)
 */
export function destroyAgents(): void {
  httpsAgent?.destroy();
  httpAgent?.destroy();
  httpsAgent = null;
  httpAgent = null;
}
