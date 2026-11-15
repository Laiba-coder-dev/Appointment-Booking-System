import { query, queryOne } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';

/** GET /api/services — public catalogue with search/filter/sort/pagination */
export const listServices = asyncHandler(async (req, res) => {
  const {
    search = '', category = '', provider = '', min_price, max_price,
    min_duration, max_duration, sort = 'popular', page = 1, limit = 9, featured
  } = req.query;

  const where = ['s.is_active = 1'];
  const params = [];

  if (search) {
    where.push('(s.name LIKE ? OR s.description LIKE ? OR c.name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (provider) { where.push('p.id = ?'); params.push(Number(provider)); }
  if (min_price !== undefined && min_price !== '') { where.push('s.price >= ?'); params.push(Number(min_price)); }
  if (max_price !== undefined && max_price !== '') { where.push('s.price <= ?'); params.push(Number(max_price)); }
  if (min_duration) { where.push('s.duration_min >= ?'); params.push(Number(min_duration)); }
  if (max_duration) { where.push('s.duration_min <= ?'); params.push(Number(max_duration)); }
  if (featured === '1') { where.push('p.is_featured = 1'); }

  const orderBy = {
    popular: 'appt_count DESC, s.created_at DESC',
    newest: 's.created_at DESC',
    price_asc: 's.price ASC',
    price_desc: 's.price DESC',
    duration_asc: 's.duration_min ASC',
    name: 's.name ASC'
  }[sort] || 'appt_count DESC, s.created_at DESC';

  const whereSql = where.join(' AND ');
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(48, Math.max(1, Number(limit) || 9));

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN provider_profiles p ON p.id = s.provider_id
      WHERE ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT s.id, s.name, s.slug, s.description, s.duration_min, s.price, s.image_url,
            s.provider_id, s.created_at,
            c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
            u.name AS provider_name, p.is_featured, p.rating_avg, p.review_count,
            (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id) AS appt_count
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN provider_profiles p ON p.id = s.provider_id
       LEFT JOIN users u ON u.id = p.user_id
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  const total = countRow?.total || 0;
  res.json({
    success: true,
    data: {
      services: rows,
      pagination: {
        page: pageNum,
        limit: perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage))
      }
    }
  });
});

/** GET /api/services/:id */
export const getService = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const svc = await queryOne(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug,
            u.name AS provider_name, p.id AS provider_pid, p.rating_avg, p.review_count,
            p.specialization, p.experience_years, p.headline, p.bio AS provider_bio,
            p.location, p.is_featured, p.approval_status
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN provider_profiles p ON p.id = s.provider_id
       LEFT JOIN users u ON u.id = p.user_id
      WHERE s.id = ?`,
    [id]
  );
  if (!svc) throw AppError.notFound('Service not found');

  const providers = await query(
    `SELECT p.id, p.rating_avg, p.review_count, p.specialization, p.experience_years,
            p.location, p.is_featured, u.name, u.avatar_url
       FROM provider_services ps
       JOIN provider_profiles p ON p.id = ps.provider_id
       JOIN users u ON u.id = p.user_id
      WHERE ps.service_id = ? AND ps.is_active = 1 AND p.approval_status = 'approved'
      ORDER BY p.is_featured DESC, p.rating_avg DESC`,
    [id]
  );

  const reviews = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name, u.avatar_url
       FROM reviews r JOIN users u ON u.id = r.customer_id
      WHERE r.service_id = ? AND r.is_visible = 1
      ORDER BY r.created_at DESC LIMIT 8`,
    [id]
  );

  res.json({ success: true, data: { service: svc, providers, reviews } });
});

/** GET /api/services/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id AND s.is_active = 1) AS service_count
       FROM service_categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`
  );
  res.json({ success: true, data: { categories: rows } });
});

/* ------------------------ Provider-scoped CRUD ------------------------ */

/** GET /api/services/mine — provider's own services */
export const myServices = asyncHandler(async (req, res) => {
  const providerId = await resolveProviderId(req.user.id);
  if (!providerId) throw AppError.forbidden('Provider profile not found');

  const rows = await query(
    `SELECT s.*, c.name AS category_name,
            COALESCE(ps.custom_price, s.price) AS effective_price,
            COALESCE(ps.custom_duration, s.duration_min) AS effective_duration,
            ps.id AS link_id, ps.is_active AS link_active
       FROM provider_services ps
       JOIN services s ON s.id = ps.service_id
       JOIN service_categories c ON c.id = s.category_id
      WHERE ps.provider_id = ?
      ORDER BY s.name`,
    [providerId]
  );
  res.json({ success: true, data: { services: rows, provider_id: providerId } });
});

/** POST /api/services/mine — provider creates a service */
export const createService = asyncHandler(async (req, res) => {
  const providerId = await resolveProviderId(req.user.id);
  if (!providerId) throw AppError.forbidden('Provider profile not found');

  const b = req.validated.body;
  const base = await queryOne('SELECT id FROM services WHERE slug = ?', [slugify(b.name)]);
  let serviceId;

  if (base) {
    serviceId = base.id;
    await query(
      `INSERT INTO provider_services (provider_id, service_id, custom_price, custom_duration, is_active)
       VALUES (?,?,?,?,1)
       ON DUPLICATE KEY UPDATE custom_price = VALUES(custom_price), custom_duration = VALUES(custom_duration), is_active = 1`,
      [providerId, serviceId, b.price, b.duration_min]
    );
  } else {
    const r = await query(
      `INSERT INTO services (category_id, provider_id, name, slug, description, duration_min, price, image_url, is_active)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [b.category_id, providerId, b.name, await uniqueSlug(b.name), b.description || '',
       b.duration_min, b.price, b.image_url || null, b.is_active ?? 1]
    );
    serviceId = r.insertId;
    await query(
      'INSERT INTO provider_services (provider_id, service_id, custom_price, custom_duration) VALUES (?,?,?,?)',
      [providerId, serviceId, b.price, b.duration_min]
    );
  }

  const created = await queryOne('SELECT * FROM services WHERE id = ?', [serviceId]);
  res.status(201).json({ success: true, message: 'Service created', data: { service: created } });
});

/** PUT /api/services/mine/:id */
export const updateService = asyncHandler(async (req, res) => {
  const providerId = await resolveProviderId(req.user.id);
  const id = Number(req.params.id);
  const owned = await queryOne(
    'SELECT 1 FROM services WHERE id = ? AND provider_id = ?',
    [id, providerId]
  );
  if (!owned) throw AppError.notFound('Service not found');

  const b = req.validated.body;
  await query(
    `UPDATE services SET name = ?, category_id = ?, description = ?, duration_min = ?,
            price = ?, image_url = ?, is_active = ? WHERE id = ?`,
    [b.name, b.category_id, b.description || '', b.duration_min, b.price,
     b.image_url || null, b.is_active ?? 1, id]
  );
  await query(
    'UPDATE provider_services SET custom_price = ?, custom_duration = ? WHERE provider_id = ? AND service_id = ?',
    [b.price, b.duration_min, providerId, id]
  );

  const updated = await queryOne('SELECT * FROM services WHERE id = ?', [id]);
  res.json({ success: true, message: 'Service updated', data: { service: updated } });
});

/** DELETE /api/services/mine/:id */
export const deleteService = asyncHandler(async (req, res) => {
  const providerId = await resolveProviderId(req.user.id);
  const id = Number(req.params.id);
  const owned = await queryOne('SELECT 1 FROM services WHERE id = ? AND provider_id = ?', [id, providerId]);
  if (!owned) throw AppError.notFound('Service not found');

  const future = await queryOne(
    `SELECT COUNT(*) AS n FROM appointments
      WHERE service_id = ? AND start_at >= NOW() AND status IN ('pending','confirmed')`,
    [id]
  );
  if (future.n > 0) {
    throw AppError.conflict('This service has upcoming appointments and cannot be deleted. Deactivate it instead.');
  }
  await query('DELETE FROM services WHERE id = ?', [id]);
  res.json({ success: true, message: 'Service deleted' });
});

/* ------------------------ helpers ------------------------ */
export async function resolveProviderId(userId) {
  const row = await queryOne('SELECT id FROM provider_profiles WHERE user_id = ?', [userId]);
  return row ? row.id : null;
}

export function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
async function uniqueSlug(name) {
  let base = slugify(name) || 'service';
  let slug = base;
  let i = 1;
  while (await queryOne('SELECT 1 FROM services WHERE slug = ?', [slug])) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
