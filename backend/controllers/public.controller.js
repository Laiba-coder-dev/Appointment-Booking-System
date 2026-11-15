import { query, queryOne } from '../config/db.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * GET /api/providers — public directory of approved professionals
 * Supports search, specialty filter, sorting and pagination.
 */
export const listProviders = asyncHandler(async (req, res) => {
  const {
    search = '', specialty = '', featured = '', sort = 'popular',
    page = 1, limit = 12, min_rating
  } = req.query;

  const where = ["p.approval_status = 'approved'", 'u.is_active = 1'];
  const params = [];

  if (search) {
    where.push('(u.name LIKE ? OR p.specialization LIKE ? OR p.headline LIKE ? OR p.bio LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (specialty) {
    where.push('p.specialization LIKE ?');
    params.push(`%${specialty}%`);
  }
  if (featured === '1') where.push('p.is_featured = 1');
  if (min_rating) { where.push('p.rating_avg >= ?'); params.push(Number(min_rating)); }

  const orderBy = {
    popular: 'p.is_featured DESC, p.rating_avg DESC, appt_count DESC',
    rating: 'p.rating_avg DESC, p.review_count DESC',
    experience: 'p.experience_years DESC',
    name: 'u.name ASC',
    newest: 'p.created_at DESC'
  }[sort] || 'p.is_featured DESC, p.rating_avg DESC';

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(48, Number(limit) || 12);

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM provider_profiles p JOIN users u ON u.id = p.user_id ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT p.id, p.headline, p.specialization, p.experience_years, p.rating_avg,
            p.review_count, p.hourly_rate, p.location, p.is_featured, p.approval_status,
            p.created_at,
            u.name, u.avatar_url, u.email,
            (SELECT COUNT(*) FROM appointments a WHERE a.provider_id = p.id) AS appt_count,
            (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id AND ps.is_active = 1) AS service_count
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
       ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  res.json({
    success: true,
    data: {
      providers: rows,
      pagination: {
        page: pageNum,
        limit: perPage,
        total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage))
      }
    }
  });
});

/** GET /api/providers/:id — public professional profile */
export const getProvider = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const provider = await queryOne(
    `SELECT p.id, p.headline, p.bio, p.specialization, p.experience_years,
            p.rating_avg, p.review_count, p.hourly_rate, p.location,
            p.is_featured, p.approval_status, p.license_number, p.created_at,
            u.name, u.avatar_url, u.email, u.phone
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = ? AND p.approval_status = 'approved' AND u.is_active = 1`,
    [id]
  );
  if (!provider) {
    return res.status(404).json({ success: false, code: 'not_found', message: 'Professional not found' });
  }

  const [services, reviews, stats] = await Promise.all([
    query(
      `SELECT s.id, s.name, s.description, s.duration_min, s.price, s.image_url,
              c.name AS category_name, c.slug AS category_slug,
              COALESCE(ps.custom_price, s.price) AS effective_price,
              COALESCE(ps.custom_duration, s.duration_min) AS effective_duration
         FROM provider_services ps
         JOIN services s ON s.id = ps.service_id
         JOIN service_categories c ON c.id = s.category_id
        WHERE ps.provider_id = ? AND ps.is_active = 1 AND s.is_active = 1
        ORDER BY s.name`,
      [id]
    ),
    query(
      `SELECT r.id, r.rating, r.comment, r.response, r.created_at,
              u.name AS customer_name, u.avatar_url, s.name AS service_name
         FROM reviews r
         JOIN users u ON u.id = r.customer_id
         JOIN services s ON s.id = r.service_id
        WHERE r.provider_id = ? AND r.is_visible = 1
        ORDER BY r.created_at DESC LIMIT 12`,
      [id]
    ),
    queryOne(
      `SELECT
         (SELECT COUNT(*) FROM appointments WHERE provider_id = ?) AS total_appointments,
         (SELECT COUNT(*) FROM appointments WHERE provider_id = ? AND status = 'completed') AS completed,
         (SELECT COUNT(DISTINCT customer_id) FROM appointments WHERE provider_id = ?) AS total_customers`,
      [id, id, id]
    )
  ]);

  res.json({ success: true, data: { provider, services, reviews, stats } });
});

/** GET /api/testimonials — curated reviews for the landing page */
export const testimonials = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at,
            u.name AS customer_name, u.avatar_url,
            s.name AS service_name,
            pr.name AS provider_name, p.specialization
       FROM reviews r
       JOIN users u ON u.id = r.customer_id
       JOIN services s ON s.id = r.service_id
       JOIN provider_profiles p ON p.id = r.provider_id
       JOIN users pr ON pr.id = p.user_id
      WHERE r.is_visible = 1 AND r.comment IS NOT NULL AND LENGTH(r.comment) > 40
      ORDER BY r.rating DESC, r.created_at DESC
      LIMIT 12`
  );
  res.json({ success: true, data: { testimonials: rows } });
});

/** GET /api/landing/stats — platform headline numbers */
export const landingStats = asyncHandler(async (_req, res) => {
  const stats = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
       (SELECT COUNT(*) FROM provider_profiles WHERE approval_status = 'approved') AS professionals,
       (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed_bookings,
       (SELECT COUNT(*) FROM appointments) AS total_bookings,
       (SELECT COALESCE(AVG(rating),0) FROM reviews) AS avg_rating,
       (SELECT COUNT(*) FROM reviews) AS reviews,
       (SELECT COUNT(*) FROM service_categories WHERE is_active = 1) AS categories`
  );
  res.json({ success: true, data: { stats } });
});
