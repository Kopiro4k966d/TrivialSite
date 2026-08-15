import 'dotenv/config';
import pool from '../server/db.js';
import { ensureSchema } from '../server/schema.js';

try {
  await ensureSchema();
  await pool.query('SELECT 1');
  console.log('Database schema is ready.');
  await pool.end();
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
}
