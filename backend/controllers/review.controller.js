import { query, queryOne, withTransaction } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';

/** POST /api/reviews */
export const createReview = asyncHandler(async (req, res) => {
  const { appointment_id, rating, comment } = req.validated.body;

  const appt = await queryOne(
    `SELECT a.*, p.id AS provider_pid FROM appointments a
       JOIN provider_profiles p ON p.id = a.provider_id
      WHERE a.id = ?`,
    [appointment_id]
  );
  if (!appt) throw AppError.notFound('Appointment not found');
  if (appt.customer_id !== req.user.id) throw AppError.forbidden('You can only review your own appointments');
  if (appt.status !== 'completed') throw AppError.badRequest('You can only review completed appointments');

  const existing = await queryOne('SELECT id FROM reviews WHERE appointment_id = ?', [appointment_id]);
  if (existing) throw AppError.conflict('You have already reviewed this appointment');

  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO reviews (appointment_id, customer_id, provider_id, service_id, rating, comment)
       VALUES (?,?,?,?,?,?)`,
      [appointment_id, req.user.id, appt.provider_id, appt.service_id, rating, comment || null]
    );
    await conn.execute(
      `UPDATE provider_profiles SET
         rating_avg = (SELECT ROUND(AVG(rating),2) FROM reviews WHERE provider_id = ? AND is_visible = 1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = ? AND is_visible = 1)
       WHERE id = ?`,
      [appt.provider_id, appt.provider_id, appt.provider_id]
    );
  });

  res.status(201).json({ success: true, message: 'Thank you for your review!' });
});

/** GET /api/reviews/provider/:id */
export const providerReviews = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query(
    `SELECT r.id, r.rating, r.comment, r.response, r.created_at,
            u.name AS customer_name, u.avatar_url,
            s.name AS service_name
       FROM reviews r
       JOIN users u ON u.id = r.customer_id
       JOIN services s ON s.id = r.service_id
      WHERE r.provider_id = ? AND r.is_visible = 1
      ORDER BY r.created_at DESC LIMIT 50`,
    [id]
  );
  const stats = await queryOne(
    `SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating),2),0) AS avg,
            SUM(rating = 5) AS five, SUM(rating = 4) AS four, SUM(rating = 3) AS three,
            SUM(rating = 2) AS two, SUM(rating = 1) AS one
       FROM reviews WHERE provider_id = ? AND is_visible = 1`,
    [id]
  );
  res.json({ success: true, data: { reviews: rows, stats } });
});

/** GET /api/reviews/mine */
export const myReviews = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT r.*, s.name AS service_name, pr.name AS provider_name
       FROM reviews r
       JOIN services s ON s.id = r.service_id
       JOIN provider_profiles p ON p.id = r.provider_id
       JOIN users pr ON pr.id = p.user_id
      WHERE r.customer_id = ? ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: { reviews: rows } });
});

/** POST /api/reviews/:id/response — provider responds */
export const respondToReview = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const response = String(req.body.response || '').trim();
  if (!response) throw AppError.badRequest('Response text is required');
  if (response.length > 1000) throw AppError.badRequest('Response is too long');

  const review = await queryOne('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!review) throw AppError.notFound('Review not found');
  const allowed = req.user.role === 'admin' ||
    (await queryOne('SELECT 1 FROM provider_profiles WHERE id = ? AND user_id = ?', [review.provider_id, req.user.id]));
  if (!allowed) throw AppError.forbidden('You cannot respond to this review');

  await query('UPDATE reviews SET response = ? WHERE id = ?', [response, id]);
  res.json({ success: true, message: 'Response published' });
});
