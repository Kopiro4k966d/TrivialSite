import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const missingError = () => new Error('DATABASE_URL is not configured');

let pool;
if (connectionString) {
  const useSsl = process.env.DATABASE_SSL === 'true' || /sslmode=require/i.test(connectionString) || /neon\.tech|supabase\.co|render\.com/i.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DATABASE_POOL_SIZE || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
} else {
  pool = {
    async query() { throw missingError(); },
    async connect() { throw missingError(); },
    async end() {}
  };
}

export default pool;
