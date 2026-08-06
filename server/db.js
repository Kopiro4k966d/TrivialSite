import pg from 'pg';

const { Pool } = pg;

const connectionString = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.NEON_DATABASE_URL
].find(value => typeof value === 'string' && value.trim());

export const databaseConfigured = Boolean(connectionString);

function sslConfig(value) {
  const forced = String(process.env.DATABASE_SSL || '').trim().toLowerCase();
  if (forced === 'false' || forced === '0' || forced === 'off') return false;
  if (forced === 'true' || forced === '1' || forced === 'on') return { rejectUnauthorized: false };
  return /sslmode=require|neon\.tech|supabase\.co|render\.com|railway\.app/i.test(value || '')
    ? { rejectUnauthorized: false }
    : false;
}

const missingError = () => {
  const error = new Error('DATABASE_URL is not configured');
  error.code = 'DATABASE_NOT_CONFIGURED';
  return error;
};

let pool;
if (databaseConfigured) {
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  pool = new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    max: Math.max(1, Number(process.env.DATABASE_POOL_SIZE || (serverless ? 1 : 5))),
    idleTimeoutMillis: Math.max(1_000, Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 20_000)),
    connectionTimeoutMillis: Math.max(1_000, Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10_000)),
    query_timeout: Math.max(1_000, Number(process.env.DATABASE_QUERY_TIMEOUT_MS || 20_000)),
    allowExitOnIdle: true,
    application_name: process.env.DATABASE_APPLICATION_NAME || 'trivial-site'
  });
  pool.on('error', error => console.error('postgres pool:', error));
} else {
  pool = {
    async query() { throw missingError(); },
    async connect() { throw missingError(); },
    async end() {}
  };
}

export function databaseFailure(error, fallbackMessage = 'Ошибка базы данных') {
  const code = String(error?.code || '');
  if (code === 'DATABASE_NOT_CONFIGURED') {
    return {
      status: 503,
      code,
      message: 'База данных не настроена. Добавьте DATABASE_URL в переменные окружения Vercel.'
    };
  }
  if (code === '42501') {
    return {
      status: 503,
      code: 'DATABASE_PERMISSION_DENIED',
      message: 'У пользователя базы данных нет прав на миграцию. Выполните database/schema.sql владельцем БД или отключите AUTO_MIGRATE.'
    };
  }
  if (['42P01', '42703', '42804', '23502'].includes(code)) {
    return {
      status: 503,
      code: 'DATABASE_SCHEMA_ERROR',
      message: 'Структура базы данных устарела. Выполните миграцию database/schema.sql.'
    };
  }
  if (['08000', '08001', '08003', '08004', '08006', '08007', '08P01', '28P01', '3D000', '53300', '57P01', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(code)) {
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'База данных временно недоступна. Проверьте строку подключения и лимиты соединений.'
    };
  }
  return { status: 500, code: 'DATABASE_ERROR', message: fallbackMessage };
}

export default pool;
