import { query, queryOne } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';

/** GET /api/notifications */
export const listNotifications = asyncHandler(async (req, res) => {
  const { unread_only = '', limit = 20, page = 1 } = req.query;
  const params = [req.user.id];
  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unread_only === '1') sql += ' AND is_read = 0';
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(100, Number(limit) || 20), (Math.max(1, Number(page) || 1) - 1) * (Number(limit) || 20));

  const rows = await query(sql, params);
  const counts = await queryOne(
    'SELECT COUNT(*) AS total, SUM(is_read = 0) AS unread FROM notifications WHERE user_id = ?',
    [req.user.id]
  );
  res.json({ success: true, data: { notifications: rows, total: counts?.total || 0, unread: counts?.unread || 0 } });
});

/** PATCH /api/notifications/:id/read */
export const markRead = asyncHandler(async (req, res) => {
  const r = await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [Number(req.params.id), req.user.id]
  );
  if (!r.affectedRows) throw AppError.notFound('Notification not found');
  res.json({ success: true });
});

/** PATCH /api/notifications/read-all */
export const markAllRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, message: 'All notifications marked as read' });
});

/** DELETE /api/notifications/:id */
export const removeNotification = asyncHandler(async (req, res) => {
  const r = await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!r.affectedRows) throw AppError.notFound('Notification not found');
  res.json({ success: true });
});

/** GET /api/dashboard/stats — role-aware headline numbers */
export const dashboardStats = asyncHandler(async (req, res) => {
  const role = req.user.role;

  if (role === 'customer') {
    const [stats] = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(status IN ('pending','confirmed')) AS upcoming,
         SUM(status = 'completed') AS completed,
         SUM(status IN ('cancelled','rejected')) AS cancelled,
         SUM(status = 'pending') AS pending
       FROM appointments WHERE customer_id = ?`,
      [req.user.id]
    );
    const [spend] = await query(
      `SELECT COALESCE(SUM(pay.amount),0) AS total_spent, COUNT(pay.id) AS payments
         FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
        WHERE a.customer_id = ? AND pay.status = 'paid'`,
      [req.user.id]
    );
    const upcoming = await query(
      `SELECT a.*, s.name AS service_name, s.duration_min, s.price, s.image_url,
              pu.name AS provider_name, p.id AS provider_pid, u2.avatar_url AS provider_avatar,
              pay.status AS payment_status
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN provider_profiles p ON p.id = a.provider_id
         JOIN users pu ON pu.id = p.user_id
         LEFT JOIN users u2 ON u2.id = pu.id
         LEFT JOIN payments pay ON pay.appointment_id = a.id
        WHERE a.customer_id = ? AND a.start_at >= NOW() AND a.status IN ('pending','confirmed')
        ORDER BY a.start_at ASC LIMIT 5`,
      [req.user.id]
    );
    const recent = await query(
      `SELECT a.*, s.name AS service_name, pu.name AS provider_name
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN provider_profiles p ON p.id = a.provider_id
         JOIN users pu ON pu.id = p.user_id
        WHERE a.customer_id = ? ORDER BY a.created_at DESC LIMIT 5`,
      [req.user.id]
    );
    return res.json({ success: true, data: { stats, spend, upcoming, recent } });
  }

  if (role === 'provider') {
    const pid = (await queryOne('SELECT id FROM provider_profiles WHERE user_id = ?', [req.user.id]))?.id;
    if (!pid) return res.json({ success: true, data: { stats: {}, upcoming: [], recent: [] } });

    const [stats] = await query(
      `SELECT COUNT(*) AS total,
              SUM(status IN ('pending','confirmed')) AS upcoming,
              SUM(status = 'completed') AS completed,
              SUM(status IN ('cancelled','rejected')) AS cancelled,
              SUM(status = 'pending') AS pending,
              SUM(DATE(start_at) = CURDATE() AND status IN ('pending','confirmed')) AS today
       FROM appointments WHERE provider_id = ?`,
      [pid]
    );
    const [customers] = await query(
      `SELECT COUNT(DISTINCT customer_id) AS total FROM appointments WHERE provider_id = ?`, [pid]);
    const [revenue] = await query(
      `SELECT COALESCE(SUM(pay.amount),0) AS total, COALESCE(SUM(CASE WHEN DATE(pay.paid_at) = CURDATE() THEN pay.amount END),0) AS today
         FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
        WHERE a.provider_id = ? AND pay.status = 'paid'`,
      [pid]);
    const today = await query(
      `SELECT a.*, s.name AS service_name, s.duration_min, cu.name AS customer_name, cu.phone AS customer_phone
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN users cu ON cu.id = a.customer_id
        WHERE a.provider_id = ? AND DATE(a.start_at) = CURDATE() AND a.status IN ('pending','confirmed')
        ORDER BY a.start_at ASC`,
      [pid]);
    const upcoming = await query(
      `SELECT a.*, s.name AS service_name, s.duration_min, cu.name AS customer_name
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN users cu ON cu.id = a.customer_id
        WHERE a.provider_id = ? AND a.start_at >= NOW() AND a.status IN ('pending','confirmed')
        ORDER BY a.start_at ASC LIMIT 5`,
      [pid]);
    const pending = await query(
      `SELECT a.*, s.name AS service_name, s.duration_min, cu.name AS customer_name, cu.email AS customer_email
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN users cu ON cu.id = a.customer_id
        WHERE a.provider_id = ? AND a.status = 'pending'
        ORDER BY a.start_at ASC LIMIT 10`,
      [pid]);
    return res.json({ success: true, data: { stats, customers, revenue, today, upcoming, pending, provider_id: pid } });
  }

  // admin
  const [stats] = await query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
       (SELECT COUNT(*) FROM provider_profiles) AS total_providers,
       (SELECT COUNT(*) FROM provider_profiles WHERE approval_status = 'pending') AS pending_providers,
       (SELECT COUNT(*) FROM appointments) AS total_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status = 'pending') AS pending_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') AS confirmed_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completed_appointments,
       (SELECT COUNT(*) FROM appointments WHERE status IN ('cancelled','rejected')) AS cancelled_appointments,
       (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'paid') AS total_revenue`
  );
  res.json({ success: true, data: { stats } });
});
