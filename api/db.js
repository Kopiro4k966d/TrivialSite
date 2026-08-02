import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : false });
export default pool;
