import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utilities/AppError.js';
import { queryOne } from '../config/db.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * Never fall back to a publicly-known constant (ISSUE-12).
 * - production: fail fast — refuse to boot without JWT_SECRET.
 * - dev: use a machine-local secret file so tokens survive restarts
 *   (auto-generated on first run, not committed).
 */
function resolveSecret() {
  const env = process.env.JWT_SECRET;
  if (env) return env;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production — refusing to start with an unsigned-able key.');
  }
  const file = path.join(ROOT, '..', '.jwt-secret');
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, generated, { mode: 0o600 });
    console.warn('[auth] JWT_SECRET missing — generated a dev secret at backend/.jwt-secret (do not commit).');
    return generated;
  } catch {
    console.warn('[auth] JWT_SECRET missing and dev secret file unavailable — using per-process random secret (sessions reset on restart).');
    return crypto.randomBytes(32).toString('hex');
  }
}

const SECRET = resolveSecret;

/** Verify the bearer token and attach the fresh user row to req.user. */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw AppError.unauthorized('Missing authentication token');

    let payload;
    try {
      payload = jwt.verify(token, SECRET());
    } catch (e) {
      throw AppError.unauthorized(
        e.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Invalid token'
      );
    }

    const user = await queryOne(
      'SELECT id, name, email, role, phone, avatar_url, is_active, created_at FROM users WHERE id = ?',
      [payload.sub]
    );
    if (!user) throw AppError.unauthorized('Account no longer exists');
    if (!user.is_active) throw AppError.forbidden('This account has been deactivated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth — attaches req.user when a valid token is present, never fails. */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, SECRET());
      const user = await queryOne(
        'SELECT id, name, email, role, phone, avatar_url, is_active FROM users WHERE id = ? AND is_active = 1',
        [payload.sub]
      );
      if (user) req.user = user;
    }
  } catch (_) {
    /* ignore — optional */
  }
  next();
}

/** Role gate: authorize('admin') or authorize('admin','provider') */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions for this action'));
    }
    next();
  };
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    SECRET(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
