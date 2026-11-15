
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Use EthioDeploy's DATABASE_URL in production.
// Use your local XAMPP credentials during local development.
let databaseConfig;

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);

  databaseConfig = {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  };
} else {
  databaseConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'appointify'
  };
}

const pool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true,
  dateStrings: false,
  timezone: 'Z'
});

/** Run a query with optional connection (for transactions). */
export async function query(sql, params = [], conn = null) {
  const executor = conn || pool;
  const [rows] = await executor.execute(sql, params);
  return rows;
}

/** Get a single row. */
export async function queryOne(sql, params = [], conn = null) {
  const rows = await query(sql, params, conn);
  return rows.length ? rows[0] : null;
}

/** Execute a function inside a transaction. */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // Ignore rollback errors.
    }
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
