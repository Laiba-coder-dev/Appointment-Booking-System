import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';

/** GET /api/profile */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_url, u.created_at, u.last_login_at,
            c.date_of_birth, c.gender, c.address, c.city, c.country, c.notes,
            p.id AS provider_id, p.headline, p.bio, p.specialization, p.experience_years,
            p.rating_avg, p.review_count, p.hourly_rate, p.approval_status, p.location, p.is_featured
       FROM users u
       LEFT JOIN customer_profiles c ON c.user_id = u.id
       LEFT JOIN provider_profiles  p ON p.user_id = u.id
      WHERE u.id = ?`,
    [req.user.id]
  );
  if (!user) throw AppError.notFound('Profile not found');
  res.json({ success: true, data: { profile: user } });
});

/** PUT /api/profile */
export const updateProfile = asyncHandler(async (req, res) => {
  const b = req.validated.body;

  const fields = [];
  const values = [];
  const map = {
    name: b.name, phone: b.phone, avatar_url: b.avatar_url
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (fields.length) {
    values.push(req.user.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const cFields = [];
  const cValues = [];
  const cMap = {
    date_of_birth: b.date_of_birth, gender: b.gender, address: b.address,
    city: b.city, country: b.country, notes: b.notes
  };
  for (const [k, v] of Object.entries(cMap)) {
    if (v !== undefined) { cFields.push(`${k} = ?`); cValues.push(v || null); }
  }
  if (cFields.length) {
    cValues.push(req.user.id);
    await query(
      `INSERT INTO customer_profiles (user_id, ${cFields.map((f) => f.split(' =')[0]).join(', ')})
       VALUES (?, ${cFields.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${cFields.join(', ')}`,
      cValues
    );
  }

  const profile = await queryOne(
    'SELECT id, name, email, role, phone, avatar_url FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json({ success: true, message: 'Profile updated', data: { profile } });
});

/** PUT /api/profile/password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) throw AppError.validation('Your current password is incorrect', [
    { field: 'currentPassword', message: 'Your current password is incorrect' }
  ]);
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ success: true, message: 'Password changed successfully' });
});
