import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Enable connection pool configuration
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a pool with more robust configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients the pool should contain
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed (30 seconds)
  connectionTimeoutMillis: 10000, // How long to wait for a connection to be established (10 seconds)
  maxUses: 100, // Close a connection after it's been used this many times
  allowExitOnIdle: true // Allow the pool to exit if all connections are idle
});

// Handle pool errors and reconnection
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't exit process on error, just log it
});

// Create drizzle ORM instance
export const db = drizzle({ client: pool, schema });

// Function to check database connection
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection successful');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
