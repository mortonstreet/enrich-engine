import net from 'net';
import tls from 'tls';
import logger from '@/lib/logger';

// ============================================
// SMTP Connection Pool for Connection Reuse
// ============================================

interface SmtpConnection {
  socket: net.Socket | tls.TLSSocket;
  mxHost: string;
  port: number;
  lastUsed: number;
  inUse: boolean;
  supportsSTARTTLS: boolean;
  useTLS: boolean;
}

interface PoolConfig {
  maxConnectionsPerHost: number;
  connectionIdleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const DEFAULT_CONFIG: PoolConfig = {
  maxConnectionsPerHost: 3,
  connectionIdleTimeoutMs: 30000, // 30 seconds
  connectionTimeoutMs: 10000, // 10 seconds
};

class SmtpConnectionPool {
  private connections: Map<string, SmtpConnection[]> = new Map();
  private config: PoolConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  private getHostKey(mxHost: string, port: number): string {
    return `${mxHost}:${port}`;
  }

  async acquire(mxHost: string, port: number = 25): Promise<SmtpConnection | null> {
    const hostKey = this.getHostKey(mxHost, port);
    const hostConnections = this.connections.get(hostKey) || [];

    // Find an available connection
    const availableConnection = hostConnections.find(conn =>
      !conn.inUse &&
      conn.socket.writable &&
      Date.now() - conn.lastUsed < this.config.connectionIdleTimeoutMs
    );

    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      logger.debug({ mxHost, port }, 'Reusing pooled connection');
      return availableConnection;
    }

    // Check if we can create a new connection
    const activeConnections = hostConnections.filter(conn => conn.socket.writable);
    if (activeConnections.length >= this.config.maxConnectionsPerHost) {
      logger.debug({ mxHost, port, count: activeConnections.length }, 'Connection pool full');
      return null;
    }

    // Create new connection
    try {
      const connection = await this.createConnection(mxHost, port);
      if (!this.connections.has(hostKey)) {
        this.connections.set(hostKey, []);
      }
      this.connections.get(hostKey)!.push(connection);
      logger.debug({ mxHost, port }, 'Created new pooled connection');
      return connection;
    } catch (error) {
      logger.error({ mxHost, port, error }, 'Failed to create connection');
      return null;
    }
  }

  release(connection: SmtpConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  destroy(connection: SmtpConnection): void {
    try {
      connection.socket.destroy();
    } catch {
      // Ignore errors on destroy
    }

    const hostKey = this.getHostKey(connection.mxHost, connection.port);
    const hostConnections = this.connections.get(hostKey);
    if (hostConnections) {
      const index = hostConnections.indexOf(connection);
      if (index > -1) {
        hostConnections.splice(index, 1);
      }
    }
  }

  private async createConnection(mxHost: string, port: number): Promise<SmtpConnection> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: mxHost, port });
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeoutMs);

      socket.once('connect', () => {
        clearTimeout(timeout);

        const connection: SmtpConnection = {
          socket,
          mxHost,
          port,
          lastUsed: Date.now(),
          inUse: true,
          supportsSTARTTLS: false,
          useTLS: false,
        };

        resolve(connection);
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async upgradeToTLS(connection: SmtpConnection): Promise<SmtpConnection> {
    return new Promise((resolve, reject) => {
      const tlsSocket = tls.connect({
        socket: connection.socket,
        servername: connection.mxHost,
        rejectUnauthorized: false, // Many mail servers have self-signed certs
      });

      const timeout = setTimeout(() => {
        tlsSocket.destroy();
        reject(new Error('TLS upgrade timeout'));
      }, this.config.connectionTimeoutMs);

      tlsSocket.once('secureConnect', () => {
        clearTimeout(timeout);
        connection.socket = tlsSocket;
        connection.useTLS = true;
        resolve(connection);
      });

      tlsSocket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 10000); // Every 10 seconds
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [hostKey, connections] of this.connections) {
      const activeConnections = connections.filter(conn => {
        if (!conn.socket.writable) {
          return false;
        }
        if (!conn.inUse && now - conn.lastUsed > this.config.connectionIdleTimeoutMs) {
          conn.socket.destroy();
          cleanedCount++;
          return false;
        }
        return true;
      });

      if (activeConnections.length === 0) {
        this.connections.delete(hostKey);
      } else {
        this.connections.set(hostKey, activeConnections);
      }
    }

    if (cleanedCount > 0) {
      logger.debug({ cleanedCount }, 'Cleaned up idle connections');
    }
  }

  getStats(): {
    totalHosts: number;
    totalConnections: number;
    activeConnections: number;
  } {
    let totalConnections = 0;
    let activeConnections = 0;

    for (const connections of this.connections.values()) {
      for (const conn of connections) {
        if (conn.socket.writable) {
          totalConnections++;
          if (conn.inUse) {
            activeConnections++;
          }
        }
      }
    }

    return {
      totalHosts: this.connections.size,
      totalConnections,
      activeConnections,
    };
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const connections of this.connections.values()) {
      for (const conn of connections) {
        conn.socket.destroy();
      }
    }

    this.connections.clear();
    logger.info('SMTP connection pool shut down');
  }
}

// Singleton instance
let poolInstance: SmtpConnectionPool | null = null;

export function getConnectionPool(): SmtpConnectionPool {
  if (!poolInstance) {
    poolInstance = new SmtpConnectionPool();
  }
  return poolInstance;
}

export function shutdownConnectionPool(): Promise<void> {
  if (poolInstance) {
    return poolInstance.shutdown();
  }
  return Promise.resolve();
}

export { SmtpConnectionPool };
