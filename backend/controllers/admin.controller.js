import bcrypt from 'bcryptjs';
import { query, queryOne, withTransaction } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';

/* --------------------------- Users --------------------------- */

/** GET /api/admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  const { search = '', role = '', status = '', page = 1, limit = 10 } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    const like = `%${search}%`; params.push(like, like, like);
  }
  if (role) { where.push('u.role = ?'); params.push(role); }
  if (status) { where.push('u.is_active = ?'); params.push(Number(status)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);
  const countRow = await queryOne(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);

  const rows = await query(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_url, u.is_active,
            u.created_at, u.last_login_at,
            p.approval_status, p.specialization, p.rating_avg, p.review_count,
            (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = u.id) AS bookings_as_customer,
            (SELECT COUNT(*) FROM appointments a JOIN provider_profiles pp ON pp.id = a.provider_id
              WHERE pp.user_id = u.id) AS bookings_as_provider
       FROM users u
       LEFT JOIN provider_profiles p ON p.user_id = u.id
       ${whereSql}
      ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  res.json({
    success: true,
    data: { users: rows,
      pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } }
  });
});

/** POST /api/admin/users */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, is_active } = req.validated.body;
  if (await queryOne('SELECT id FROM users WHERE email = ?', [email])) {
    throw AppError.conflict('An account with this email already exists');
  }
  const hash = await bcrypt.hash(password, 12);
  const id = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES (?,?,?,?,?,?)',
      [name, email, hash, role, phone || null, is_active]
    );
    if (role === 'customer') await conn.execute('INSERT INTO customer_profiles (user_id) VALUES (?)', [r.insertId]);
    if (role === 'provider') {
      await conn.execute(
        `INSERT INTO provider_profiles (user_id, approval_status) VALUES (?, 'approved')`, [r.insertId]);
    }
    return r.insertId;
  });
  const user = await queryOne('SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?', [id]);
  res.status(201).json({ success: true, message: 'User created', data: { user } });
});

/** PUT /api/admin/users/:id */
export const updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) throw AppError.notFound('User not found');

  const b = req.body || {};
  const fields = [];
  const values = [];
  if (b.name !== undefined) { fields.push('name = ?'); values.push(b.name); }
  if (b.email !== undefined && b.email !== existing.email) {
    if (await queryOne('SELECT id FROM users WHERE email = ? AND id <> ?', [b.email, id])) {
      throw AppError.conflict('An account with this email already exists');
    }
    fields.push('email = ?'); values.push(b.email);
  }
  if (b.phone !== undefined) { fields.push('phone = ?'); values.push(b.phone || null); }
  if (b.role !== undefined) { fields.push('role = ?'); values.push(b.role); }
  if (b.is_active !== undefined) { fields.push('is_active = ?'); values.push(Number(b.is_active)); }
  if (b.password) {
    if (String(b.password).length < 8) throw AppError.validation('Password must be at least 8 characters');
    fields.push('password_hash = ?');
    values.push(await bcrypt.hash(b.password, 12));
  }
  if (fields.length) {
    values.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }
  const user = await queryOne(
    'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?', [id]);
  res.json({ success: true, message: 'User updated', data: { user } });
});

/** DELETE /api/admin/users/:id */
export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw AppError.badRequest('You cannot delete your own account');
  const user = await queryOne('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!user) throw AppError.notFound('User not found');

  const active = await queryOne(
    `SELECT COUNT(*) AS n FROM appointments
      WHERE customer_id = ? AND status IN ('pending','confirmed')
         OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = ?)
         AND status IN ('pending','confirmed')`,
    [id, id]
  );
  if (active.n > 0) {
    // soft-delete instead of breaking FK references
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ success: true, message: 'User has active bookings — account deactivated instead of deleted' });
  }
  await query('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true, message: 'User deleted' });
});

/* --------------------------- Providers --------------------------- */

/** GET /api/admin/providers */
export const listProviders = asyncHandler(async (req, res) => {
  const { search = '', approval = '', page = 1, limit = 10 } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR p.specialization LIKE ?)');
    const like = `%${search}%`; params.push(like, like, like);
  }
  if (approval) { where.push('p.approval_status = ?'); params.push(approval); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);
  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM provider_profiles p JOIN users u ON u.id = p.user_id ${whereSql}`, params);

  const rows = await query(
    `SELECT p.*, u.name, u.email, u.phone, u.avatar_url, u.is_active, u.created_at,
            (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id) AS service_count,
            (SELECT COUNT(*) FROM appointments a WHERE a.provider_id = p.id) AS appointment_count
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
       ${whereSql}
      ORDER BY FIELD(p.approval_status,'pending','approved','rejected'), u.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  res.json({
    success: true,
    data: { providers: rows,
      pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } }
  });
});

/** PATCH /api/admin/providers/:id/approval */
export const approveProvider = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { approval_status } = req.validated.body;
  const p = await queryOne(
    `SELECT p.id, p.user_id, u.name, u.email FROM provider_profiles p
       JOIN users u ON u.id = p.user_id WHERE p.id = ?`, [id]);
  if (!p) throw AppError.notFound('Provider not found');

  await query('UPDATE provider_profiles SET approval_status = ? WHERE id = ?', [approval_status, id]);
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
    [p.user_id, `Provider application ${approval_status}`,
     approval_status === 'approved'
       ? 'Congratulations! Your provider profile has been approved. You can now publish services.'
       : 'Your provider application was not approved. Please contact support for details.',
     approval_status === 'approved' ? 'success' : 'warning', '/provider']
  );
  const profile = await queryOne('SELECT * FROM provider_profiles WHERE id = ?', [id]);
  res.json({ success: true, message: `Provider ${approval_status}`, data: { provider: profile } });
});

/** PATCH /api/admin/providers/:id */
export const updateProvider = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const fields = [];
  const values = [];
  const allowed = ['specialization', 'headline', 'bio', 'experience_years', 'hourly_rate', 'location', 'is_featured', 'approval_status'];
  for (const k of allowed) {
    if (b[k] !== undefined) { fields.push(`${k} = ?`); values.push(b[k] === '' ? null : b[k]); }
  }
  if (fields.length) {
    values.push(id);
    await query(`UPDATE provider_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  }
  const profile = await queryOne('SELECT * FROM provider_profiles WHERE id = ?', [id]);
  if (!profile) throw AppError.notFound('Provider not found');
  res.json({ success: true, message: 'Provider updated', data: { provider: profile } });
});

/* --------------------------- Services / categories --------------------------- */

/** GET /api/admin/services */
export const adminListServices = asyncHandler(async (req, res) => {
  const { search = '', category = '', status = '', page = 1, limit = 10 } = req.query;
  const where = [];
  const params = [];
  if (search) { where.push('(s.name LIKE ? OR s.description LIKE ?)'); const l = `%${search}%`; params.push(l, l); }
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (status) { where.push('s.is_active = ?'); params.push(Number(status)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);
  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM services s JOIN service_categories c ON c.id = s.category_id ${whereSql}`, params);

  const rows = await query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug,
            u.name AS provider_name, p.approval_status,
            (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id) AS bookings
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN provider_profiles p ON p.id = s.provider_id
       LEFT JOIN users u ON u.id = p.user_id
       ${whereSql}
      ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );
  res.json({ success: true, data: { services: rows,
    pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
      totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } } });
});

/** POST /api/admin/services */
export const adminCreateService = asyncHandler(async (req, res) => {
  const b = req.validated.body;
  const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let finalSlug = slug;
  let i = 1;
  while (await queryOne('SELECT 1 FROM services WHERE slug = ?', [finalSlug])) finalSlug = `${slug}-${i++}`;
  const r = await query(
    `INSERT INTO services (category_id, provider_id, name, slug, description, duration_min, price, image_url, is_active)
     VALUES (?,NULL,?,?,?,?,?,?,?)`,
    [b.category_id, b.name, finalSlug, b.description || '', b.duration_min, b.price,
     b.image_url || null, b.is_active ?? 1]
  );
  const service = await queryOne('SELECT * FROM services WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, message: 'Service created', data: { service } });
});

/** PUT /api/admin/services/:id */
export const adminUpdateService = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await queryOne('SELECT 1 FROM services WHERE id = ?', [id]))) throw AppError.notFound('Service not found');
  const b = req.validated.body;
  await query(
    `UPDATE services SET name = ?, category_id = ?, description = ?, duration_min = ?,
            price = ?, image_url = ?, is_active = ? WHERE id = ?`,
    [b.name, b.category_id, b.description || '', b.duration_min, b.price, b.image_url || null, b.is_active ?? 1, id]
  );
  const service = await queryOne('SELECT * FROM services WHERE id = ?', [id]);
  res.json({ success: true, message: 'Service updated', data: { service } });
});

/** DELETE /api/admin/services/:id */
export const adminDeleteService = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const future = await queryOne(
    `SELECT COUNT(*) AS n FROM appointments WHERE service_id = ? AND start_at >= NOW()
       AND status IN ('pending','confirmed')`, [id]);
  if (future.n > 0) throw AppError.conflict('Service has upcoming appointments');
  const r = await query('DELETE FROM services WHERE id = ?', [id]);
  if (!r.affectedRows) throw AppError.notFound('Service not found');
  res.json({ success: true, message: 'Service deleted' });
});

/** GET/POST/PUT/DELETE /api/admin/categories */
export const listAllCategories = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) AS service_count
       FROM service_categories c ORDER BY c.sort_order, c.name`);
  res.json({ success: true, data: { categories: rows } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const b = req.validated.body;
  const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (await queryOne('SELECT 1 FROM service_categories WHERE slug = ?', [slug])) {
    throw AppError.conflict('A category with that name already exists');
  }
  const r = await query(
    'INSERT INTO service_categories (name, slug, description, image_url, sort_order) VALUES (?,?,?,?,?)',
    [b.name, slug, b.description || '', b.image_url || null, b.sort_order ?? 0]
  );
  const category = await queryOne('SELECT * FROM service_categories WHERE id = ?', [r.insertId]);
  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.validated.body;
  const r = await query(
    'UPDATE service_categories SET name = ?, description = ?, image_url = ?, sort_order = ? WHERE id = ?',
    [b.name, b.description || '', b.image_url || null, b.sort_order ?? 0, id]);
  if (!r.affectedRows) throw AppError.notFound('Category not found');
  res.json({ success: true, message: 'Category updated' });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const used = await queryOne('SELECT COUNT(*) AS n FROM services WHERE category_id = ?', [id]);
  if (used.n > 0) throw AppError.conflict(`Category is used by ${used.n} service(s)`);
  const r = await query('DELETE FROM service_categories WHERE id = ?', [id]);
  if (!r.affectedRows) throw AppError.notFound('Category not found');
  res.json({ success: true, message: 'Category deleted' });
});

/* --------------------------- Appointments / payments --------------------------- */

/** GET /api/admin/appointments — global view with filters */
export const adminAppointments = asyncHandler(async (req, res) => {
  const { status = '', search = '', from, to, provider, customer, page = 1, limit = 10 } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push('a.status = ?'); params.push(status); }
  if (from) { where.push('a.start_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('a.start_at <= ?'); params.push(`${to} 23:59:59`); }
  if (provider) { where.push('a.provider_id = ?'); params.push(Number(provider)); }
  if (customer) { where.push('a.customer_id = ?'); params.push(Number(customer)); }
  if (search) {
    where.push('(a.reference LIKE ? OR cu.name LIKE ? OR cu.email LIKE ? OR s.name LIKE ? OR pu.name LIKE ?)');
    const l = `%${search}%`; params.push(l, l, l, l, l);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM appointments a
       JOIN users cu ON cu.id = a.customer_id
       JOIN services s ON s.id = a.service_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id ${whereSql}`, params);

  const rows = await query(
    `SELECT a.*, s.name AS service_name, s.price,
            cu.name AS customer_name, cu.email AS customer_email,
            pu.name AS provider_name,
            pay.status AS payment_status, pay.amount AS payment_amount, pay.transaction_ref
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       ${whereSql}
      ORDER BY a.start_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]);

  res.json({ success: true, data: { appointments: rows,
    pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
      totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } } });
});

/** GET /api/admin/payments */
export const adminPayments = asyncHandler(async (req, res) => {
  const { status = '', search = '', page = 1, limit = 10 } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push('pay.status = ?'); params.push(status); }
  if (search) {
    where.push('(pay.transaction_ref LIKE ? OR a.reference LIKE ? OR u.name LIKE ?)');
    const l = `%${search}%`; params.push(l, l, l);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id ${whereSql}`, params);

  const rows = await query(
    `SELECT pay.*, a.reference AS appointment_reference, a.start_at,
            u.name AS customer_name, u.email AS customer_email,
            s.name AS service_name, pr.name AS provider_name
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id
       JOIN services s ON s.id = a.service_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pr ON pr.id = p.user_id
       ${whereSql}
      ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]);

  const totals = await queryOne(
    `SELECT COALESCE(SUM(CASE WHEN pay.status='paid' THEN pay.amount END),0) AS gross,
            COALESCE(SUM(CASE WHEN pay.status IN ('refunded','partially_refunded') THEN pay.refunded_amount END),0) AS refunded,
            COALESCE(SUM(CASE WHEN pay.status='pending' THEN pay.amount END),0) AS pending_amount,
            COUNT(*) AS count
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id ${whereSql}`,
    params);

  res.json({ success: true, data: { payments: rows, totals,
    pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
      totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } } });
});

/** GET /api/admin/reports */
export const adminReports = asyncHandler(async (_req, res) => {
  const monthlyBookings = await query(
    `SELECT DATE_FORMAT(start_at, '%Y-%m') AS month, COUNT(*) AS total,
            SUM(status='completed') AS completed,
            SUM(status='pending') AS pending,
            SUM(status='confirmed') AS confirmed,
            SUM(status IN ('cancelled','rejected')) AS cancelled
       FROM appointments
      WHERE start_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`);

  const revenueAnalytics = await query(
    `SELECT DATE_FORMAT(pay.paid_at, '%Y-%m') AS month,
            COALESCE(SUM(pay.amount),0) AS revenue, COUNT(*) AS transactions
       FROM payments pay
      WHERE pay.status='paid' AND pay.paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`);

  const popularServices = await query(
    `SELECT s.name, c.name AS category, COUNT(a.id) AS bookings,
            COALESCE(SUM(pay.amount),0) AS revenue, ROUND(AVG(s.duration_min)) AS avg_duration
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN appointments a ON a.service_id = s.id
       LEFT JOIN payments pay ON pay.appointment_id = a.id AND pay.status='paid'
      GROUP BY s.id ORDER BY bookings DESC LIMIT 8`);

  const providerPerformance = await query(
    `SELECT u.name AS provider, p.rating_avg, p.review_count, p.specialization,
            COUNT(a.id) AS bookings,
            SUM(a.status='completed') AS completed,
            SUM(a.status IN ('cancelled','rejected')) AS cancelled,
            COALESCE(SUM(CASE WHEN pay.status='paid' THEN pay.amount END),0) AS revenue
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN appointments a ON a.provider_id = p.id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
      GROUP BY p.id ORDER BY revenue DESC, bookings DESC LIMIT 10`);

  const statusSplit = await query(
    'SELECT status, COUNT(*) AS value FROM appointments GROUP BY status');

  const categorySplit = await query(
    `SELECT c.name AS name, COUNT(a.id) AS value
       FROM service_categories c LEFT JOIN services s ON s.category_id = c.id
       LEFT JOIN appointments a ON a.service_id = s.id
      GROUP BY c.id ORDER BY value DESC`);

  const dailyBookings = await query(
    `SELECT DATE(start_at) AS day, COUNT(*) AS total
       FROM appointments
      WHERE start_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY day ORDER BY day`);

  const kpis = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM appointments) AS total_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status='completed') AS completed,
       (SELECT COUNT(*) FROM appointments WHERE status='pending') AS pending,
       (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='paid') AS revenue,
       (SELECT COALESCE(AVG(amount),0) FROM payments WHERE status='paid') AS avg_order_value,
       (SELECT COUNT(*) FROM reviews) AS total_reviews,
       (SELECT COALESCE(AVG(rating),0) FROM reviews) AS avg_rating,
       (SELECT COUNT(*) FROM users WHERE role='customer') AS customers`);

  res.json({ success: true, data: { monthlyBookings, revenueAnalytics, popularServices,
    providerPerformance, statusSplit, categorySplit, dailyBookings, kpis } });
});
