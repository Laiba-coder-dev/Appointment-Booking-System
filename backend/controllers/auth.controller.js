import bcrypt from 'bcryptjs';
import { query, queryOne, withTransaction } from '../config/db.js';
import { signAccessToken } from '../middleware/auth.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';
import mailer from '../services/email.service.js';

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone || null,
  avatar_url: u.avatar_url || null,
  is_active: u.is_active,
  created_at: u.created_at,
  provider_id: u.provider_id ?? null,
  approval_status: u.approval_status ?? null,
  specialization: u.specialization ?? null
});

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'customer', phone, specialization, headline, bio, experience_years, location } =
    req.validated.body;

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw AppError.conflict('An account with this email already exists');

  const password_hash = await bcrypt.hash(password, 12);

  const user = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [name, email, password_hash, role, phone || null]
    );
    const userId = r.insertId;

    if (role === 'customer') {
      await conn.execute('INSERT INTO customer_profiles (user_id) VALUES (?)', [userId]);
    } else if (role === 'provider') {
      await conn.execute(
        `INSERT INTO provider_profiles
           (user_id, headline, bio, specialization, experience_years, location, approval_status)
         VALUES (?,?,?,?,?,?,'pending')`,
        [userId, headline || null, bio || null, specialization || null,
         experience_years || 0, location || null]
      );
    }
    return { id: userId, name, email, role, phone: phone || null };
  });

  const token = signAccessToken(user);
  mailer.welcome(user).catch(() => {});

  res.status(201).json({
    success: true,
    message:
      role === 'provider'
        ? 'Account created. Your provider profile is pending admin approval.'
        : 'Welcome to Appointify! Your account is ready.',
    data: { user: publicUser(user), token }
  });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const user = await queryOne(
    `SELECT u.*, p.id AS provider_id, p.approval_status, p.specialization
       FROM users u
       LEFT JOIN provider_profiles p ON p.user_id = u.id
      WHERE u.email = ?`,
    [email]
  );

  if (!user) throw AppError.unauthorized('Incorrect email or password');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw AppError.unauthorized('Incorrect email or password');
  if (!user.is_active) throw AppError.forbidden('This account has been deactivated. Contact support.');

  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  res.json({
    success: true,
    message: `Welcome back, ${user.name}`,
    data: { user: publicUser(user), token: signAccessToken(user) }
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_url, u.is_active, u.created_at,
            p.id AS provider_id, p.approval_status, p.specialization, p.headline, p.bio,
            p.experience_years, p.rating_avg, p.review_count, p.is_featured, p.location,
            p.hourly_rate, p.approval_status
       FROM users u
       LEFT JOIN provider_profiles p ON p.user_id = u.id
      WHERE u.id = ?`,
    [req.user.id]
  );
  res.json({ success: true, data: { user: publicUser(user), profile: user } });
});

/** POST /api/auth/logout — stateless JWT, client discards token. */
export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Signed out successfully' });
});
