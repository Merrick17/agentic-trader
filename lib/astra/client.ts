import { DataAPIClient, type Db } from '@datastax/astra-db-ts';

// Environment variable names
const TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;
const NAMESPACE = process.env.ASTRA_DB_NAMESPACE;

// Singleton client instance
let client: DataAPIClient | null = null;
let dbInstance: Db | null = null;

/**
 * Get or create the DataAPIClient instance
 * Uses singleton pattern to avoid creating multiple clients
 */
export function getClient(): DataAPIClient {
  if (!client) {
    if (!TOKEN) {
      throw new Error('ASTRA_DB_APPLICATION_TOKEN environment variable is required');
    }
    client = new DataAPIClient(TOKEN);
  }
  return client;
}

/**
 * Get or create the database instance
 * Uses singleton pattern with lazy initialization
 */
export function getDb(): Db {
  if (!dbInstance) {
    if (!ENDPOINT) {
      throw new Error('ASTRA_DB_API_ENDPOINT environment variable is required');
    }

    const dbClient = getClient();

    // Initialize with optional namespace/keyspace
    // Note: namespace is optional - if not provided, uses default keyspace
    dbInstance = dbClient.db(ENDPOINT, {
      ...(NAMESPACE && { keyspace: NAMESPACE }),
    });
  }
  return dbInstance;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getDb() instead
 */
export const db = {
  collection: (name: string) => getDb().collection(name),
};

/**
 * Check if the database connection is working
 * Useful for health checks
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const database = getDb();
    // Try to list collections as a connection test
    await database.listCollections();
    return true;
  } catch (error) {
    console.error('Failed to connect to Astra DB:', error);
    return false;
  }
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  client = null;
  dbInstance = null;
}
