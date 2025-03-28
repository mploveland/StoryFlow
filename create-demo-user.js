import pg from 'pg';
const { Pool } = pg;

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createDemoUser() {
  try {
    // Check if demo user already exists
    const checkResult = await pool.query('SELECT id FROM users WHERE username = $1', ['demo']);
    
    if (checkResult.rows.length > 0) {
      console.log('Demo user already exists with ID:', checkResult.rows[0].id);
      return;
    }
    
    // Insert the demo user
    const result = await pool.query(
      'INSERT INTO users (username, password, display_name, email) VALUES ($1, $2, $3, $4) RETURNING id',
      ['demo', 'password', 'Demo User', 'demo@example.com']
    );
    
    console.log('Demo user created with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error creating demo user:', error);
  } finally {
    pool.end();
  }
}

createDemoUser();