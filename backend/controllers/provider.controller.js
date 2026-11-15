import { query, queryOne } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';
import { resolveProviderId } from './service.controller.js';
import { getSlotsForDate } from '../services/availability.service.js';

/* ------------------------- Availability ------------------------- */

/** GET /api/provider/availability */
export const getMyAvailability = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');
  const rows = await query(
    'SELECT * FROM provider_availability WHERE provider_id = ? ORDER BY day_of_week, start_time',
    [pid]
  );
  const blocked = await query(
    'SELECT * FROM unavailable_dates WHERE provider_id = ? AND unavailable_date >= CURDATE() ORDER BY unavailable_date',
    [pid]
  );
  res.json({ success: true, data: { availability: rows, blocked_dates: blocked, provider_id: pid } });
});

/** POST /api/provider/availability */
export const addAvailability = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');
  const b = req.validated.body;

  if (b.start_time.length === 5) b.start_time += ':00';
  if (b.end_time.length === 5) b.end_time += ':00';

  try {
    await query(
      `INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, slot_interval_min, is_active)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE end_time = VALUES(end_time), slot_interval_min = VALUES(slot_interval_min),
                                is_active = VALUES(is_active)`,
      [pid, b.day_of_week, b.start_time, b.end_time, b.slot_interval_min, b.is_active]
    );
  } catch (err) {
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') throw AppError.badRequest(err.sqlMessage);
    throw err;
  }
  const rows = await query('SELECT * FROM provider_availability WHERE provider_id = ? ORDER BY day_of_week, start_time', [pid]);
  res.status(201).json({ success: true, message: 'Working hours saved', data: { availability: rows } });
});

/** DELETE /api/provider/availability/:id */
export const deleteAvailability = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  const r = await query('DELETE FROM provider_availability WHERE id = ? AND provider_id = ?', [Number(req.params.id), pid]);
  if (!r.affectedRows) throw AppError.notFound('Working hour not found');
  res.json({ success: true, message: 'Working hour removed' });
});

/** POST /api/provider/block-dates */
export const blockDate = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');
  const { unavailable_date, reason } = req.validated.body;

  const hasAppt = await queryOne(
    `SELECT COUNT(*) AS n FROM appointments
      WHERE provider_id = ? AND DATE(start_at) = ? AND status IN ('pending','confirmed')`,
    [pid, unavailable_date]
  );
  if (hasAppt.n > 0) {
    throw AppError.conflict('You have active appointments on that date. Reschedule them first.');
  }
  await query(
    `INSERT INTO unavailable_dates (provider_id, unavailable_date, reason) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
    [pid, unavailable_date, reason || null]
  );
  const rows = await query('SELECT * FROM unavailable_dates WHERE provider_id = ? ORDER BY unavailable_date', [pid]);
  res.status(201).json({ success: true, message: 'Date blocked', data: { blocked_dates: rows } });
});

/** DELETE /api/provider/block-dates/:id */
export const unblockDate = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  const r = await query('DELETE FROM unavailable_dates WHERE id = ? AND provider_id = ?', [Number(req.params.id), pid]);
  if (!r.affectedRows) throw AppError.notFound('Blocked date not found');
  res.json({ success: true, message: 'Date unblocked' });
});

/** GET /api/provider/slots?date=&duration= */
export const previewSlots = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const slots = await getSlotsForDate(pid, date, Number(req.query.duration) || 30);
  res.json({ success: true, data: slots });
});

/* ------------------------- Provider stats / customers ------------------------- */

/** GET /api/provider/analytics — Recharts-ready series */
export const providerAnalytics = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');

  const revenueByMonth = await query(
    `SELECT DATE_FORMAT(pay.paid_at, '%Y-%m') AS month,
            COALESCE(SUM(pay.amount),0) AS revenue, COUNT(*) AS payments
       FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
      WHERE a.provider_id = ? AND pay.status = 'paid' AND pay.paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`,
    [pid]
  );
  const appointmentsByMonth = await query(
    `SELECT DATE_FORMAT(start_at, '%Y-%m') AS month,
            COUNT(*) AS total,
            SUM(status = 'completed') AS completed,
            SUM(status IN ('pending','confirmed')) AS upcoming,
            SUM(status IN ('cancelled','rejected')) AS cancelled
       FROM appointments
      WHERE provider_id = ? AND start_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`,
    [pid]
  );
  const statusSplit = await query(
    `SELECT status, COUNT(*) AS value FROM appointments WHERE provider_id = ? GROUP BY status`,
    [pid]
  );
  const topServices = await query(
    `SELECT s.name, COUNT(*) AS bookings, COALESCE(SUM(pay.amount),0) AS revenue
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id AND pay.status = 'paid'
      WHERE a.provider_id = ?
      GROUP BY s.id ORDER BY bookings DESC LIMIT 6`,
    [pid]
  );
  const ratingTrend = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, ROUND(AVG(rating),2) AS rating, COUNT(*) AS count
       FROM reviews WHERE provider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month`,
    [pid]
  );

  res.json({ success: true, data: { revenueByMonth, appointmentsByMonth, statusSplit, topServices, ratingTrend } });
});

/** GET /api/provider/customers */
export const providerCustomers = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  const { search = '', page = 1, limit = 10 } = req.query;
  const params = [pid];
  let where = 'a.provider_id = ?';
  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    const like = `%${search}%`; params.push(like, like);
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Number(limit) || 10;

  const countRow = await queryOne(
    `SELECT COUNT(DISTINCT u.id) AS total FROM appointments a JOIN users u ON u.id = a.customer_id WHERE ${where}`, params);
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
            COUNT(a.id) AS total_appointments,
            MAX(a.start_at) AS last_visit,
            SUM(a.status = 'completed') AS completed
       FROM appointments a JOIN users u ON u.id = a.customer_id
      WHERE ${where}
      GROUP BY u.id ORDER BY last_visit DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );
  res.json({
    success: true,
    data: { customers: rows,
      pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) } }
  });
});

/** PATCH /api/provider/profile */
export const updateProviderProfile = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');
  const b = req.body || {};
  const fields = [];
  const values = [];
  const allowed = ['headline', 'bio', 'specialization', 'experience_years', 'hourly_rate', 'location', 'license_number', 'is_featured'];
  for (const k of allowed) {
    if (b[k] !== undefined) { fields.push(`${k} = ?`); values.push(b[k] === '' ? null : b[k]); }
  }
  if (fields.length) {
    values.push(pid);
    await query(`UPDATE provider_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  }
  const profile = await queryOne('SELECT * FROM provider_profiles WHERE id = ?', [pid]);
  res.json({ success: true, message: 'Profile updated', data: { profile } });
});

/** GET /api/provider/services-availability-status */
export const providerOverview = asyncHandler(async (req, res) => {
  const pid = await resolveProviderId(req.user.id);
  if (!pid) throw AppError.forbidden('Provider profile not found');
  const [svc] = await query('SELECT COUNT(*) AS total FROM provider_services WHERE provider_id = ? AND is_active = 1', [pid]);
  const [wd] = await query('SELECT COUNT(*) AS days FROM provider_availability WHERE provider_id = ? AND is_active = 1', [pid]);
  const profile = await queryOne(
    `SELECT p.*, u.name, u.email, u.phone, u.avatar_url FROM provider_profiles p
       JOIN users u ON u.id = p.user_id WHERE p.id = ?`, [pid]);
  res.json({ success: true, data: { provider_id: pid, services: svc.total, working_days: wd.days, profile } });
});
