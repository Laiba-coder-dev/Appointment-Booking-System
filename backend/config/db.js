import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appointify',
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

/**
 * Execute a function inside a transaction.
 * Commits on success, rolls back on any error.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
