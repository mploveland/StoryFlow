// update-schema.js
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

async function updateSchema() {
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  try {
    // Add the environment columns
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    
    // Add columns to foundations table
    console.log('Adding new columns to foundations table...');
    await sql`ALTER TABLE foundations ADD COLUMN IF NOT EXISTS genre_completed BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE foundations ADD COLUMN IF NOT EXISTS environment_completed BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE foundations ADD COLUMN IF NOT EXISTS world_completed BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE foundations ADD COLUMN IF NOT EXISTS characters_completed BOOLEAN DEFAULT FALSE`;
    
    // Add columns to environment_details table
    console.log('Adding new columns to environment_details table...');
    await sql`ALTER TABLE environment_details ADD COLUMN IF NOT EXISTS setting TEXT`;
    await sql`ALTER TABLE environment_details ADD COLUMN IF NOT EXISTS era TEXT`;
    await sql`ALTER TABLE environment_details ADD COLUMN IF NOT EXISTS atmosphere TEXT`;
    await sql`ALTER TABLE environment_details ADD COLUMN IF NOT EXISTS thread_id TEXT`;
    
    console.log('Schema updated successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();