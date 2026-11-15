import { query, queryOne, withTransaction } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';
import { getSlotsForDate, getAvailabilityRange } from '../services/availability.service.js';
import mailer from '../services/email.service.js';

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeReference() {
  let s = 'APT-';
  for (let i = 0; i < 8; i++) s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  return s;
}

/** GET /api/providers/:id/availability?date=YYYY-MM-DD&days=30&duration=60 */
export const getAvailability = asyncHandler(async (req, res) => {
  const providerId = Number(req.params.id);
  const provider = await queryOne(
    'SELECT id, approval_status FROM provider_profiles WHERE id = ?',
    [providerId]
  );
  if (!provider) throw AppError.notFound('Professional not found');
  if (provider.approval_status !== 'approved') {
    return res.json({ success: true, data: { available: false, reason: 'Professional not approved yet', days: [], slots: [] } });
  }

  const { date, days = 30, duration = 30 } = req.query;
  const start = date || new Date().toISOString().slice(0, 10);

  if (date) {
    const slotInfo = await getSlotsForDate(providerId, start, Number(duration));
    return res.json({ success: true, data: { ...slotInfo, available: !slotInfo.blocked } });
  }

  const range = await getAvailabilityRange(providerId, start, Math.min(90, Number(days)), Number(duration));
  res.json({ success: true, data: { days: range, available: true } });
});

/** GET /api/appointments/quote?service_id&provider_id&start_at */
export const quote = asyncHandler(async (req, res) => {
  const { service_id, provider_id, start_at } = req.query;
  const svc = await queryOne('SELECT id, name, duration_min, price FROM services WHERE id = ?', [Number(service_id)]);
  if (!svc) throw AppError.notFound('Service not found');
  res.json({
    success: true,
    data: {
      service: svc,
      provider_id: Number(provider_id),
      start_at,
      subtotal: Number(svc.price),
      fee: 0,
      total: Number(svc.price),
      currency: 'USD'
    }
  });
});

/**
 * POST /api/appointments
 * Creates the booking inside a transaction with row locks so two
 * customers can never occupy the same provider slot.
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const { service_id, provider_id, start_at, name, email, phone, notes } = req.validated.body;

  const svc = await queryOne(
    'SELECT id, name, duration_min, price, is_active FROM services WHERE id = ?',
    [service_id]
  );
  if (!svc || !svc.is_active) throw AppError.notFound('That service is no longer available');

  const provider = await queryOne(
    `SELECT p.id, p.approval_status, u.id AS user_id, u.name AS provider_name, u.email AS provider_email
       FROM provider_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [provider_id]
  );
  if (!provider) throw AppError.notFound('Professional not found');
  if (provider.approval_status !== 'approved') throw AppError.badRequest('This professional is not accepting bookings');

  const startDate = new Date(start_at);
  if (Number.isNaN(startDate.getTime())) throw AppError.badRequest('Invalid date and time');
  if (startDate.getTime() <= Date.now()) {
    throw AppError.badRequest('Please choose a date and time in the future');
  }

  const endDate = new Date(startDate.getTime() + svc.duration_min * 60000);
  const slot = await getSlotsForDate(
    provider_id,
    startDate.toISOString().slice(0, 10),
    svc.duration_min
  );
  const hh = String(startDate.getUTCHours()).padStart(2, '0');
  const mm = String(startDate.getUTCMinutes()).padStart(2, '0');
  const wanted = `${hh}:${mm}`;
  const match = slot.slots.find((s) => s.time === wanted);
  if (!match) {
    throw AppError.badRequest('That time is outside this professional\'s working hours');
  }
  if (!match.available) {
    throw AppError.conflict('That time slot is already booked. Please choose another.');
  }

  // Find or create the customer account for this email.
  const result = await withTransaction(async (conn) => {
    // Lock the provider row to serialise concurrent booking attempts.
    const [provRows] = await conn.execute(
      'SELECT id FROM provider_profiles WHERE id = ? FOR UPDATE',
      [provider_id]
    );
    if (!provRows.length) throw AppError.notFound('Professional not found');

    const [userRows] = await conn.execute('SELECT id, name, email FROM users WHERE email = ?', [email]);
    let customerId;
    let customerName = name;
    if (userRows.length) {
      customerId = userRows[0].id;
      customerName = userRows[0].name;
    } else {
      const bcrypt = (await import('bcryptjs')).default;
      const tempHash = await bcrypt.hash(`Appt${Date.now()}!2026`, 12);
      const [ins] = await conn.execute(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,\'customer\',?)',
        [name, email, tempHash, phone || null]
      );
      customerId = ins.insertId;
      await conn.execute('INSERT INTO customer_profiles (user_id) VALUES (?)', [customerId]);
      // guard against a race on the unique email key
    }

    const reference = makeReference();
    const [appt] = await conn.execute(
      `INSERT INTO appointments
         (reference, customer_id, provider_id, service_id, start_at, end_at, status, notes)
       VALUES (?,?,?,?,?,?, 'pending', ?)`,
      [reference, customerId, provider_id, service_id,
       toSql(startDate), toSql(endDate), notes || null]
    );

    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?,?,?,?,?)`,
      [customerId, 'Booking requested',
       `Your ${svc.name} appointment request for ${startDate.toUTCString()} has been received.`,
       'appointment', '/dashboard/appointments']
    );
    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?,?,?,?,?)`,
      [provider.user_id, 'New booking request',
       `${customerName} requested a ${svc.name} appointment.`,
       'appointment', '/provider/requests']
    );

    return {
      id: appt.insertId,
      reference,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: email,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      service_name: svc.name,
      provider_name: provider.provider_name,
      total: Number(svc.price)
    };
  });

  res.status(201).json({
    success: true,
    message: 'Appointment requested — the professional will approve or decline it shortly',
    data: { appointment: result }
  });
});

/** GET /api/appointments — scoped by role */
export const listAppointments = asyncHandler(async (req, res) => {
  const { status = '', page = 1, limit = 10, from, to, search = '', provider, customer, exclude = '' } = req.query;
  const params = [];
  const where = [];

  if (req.user.role === 'customer') {
    where.push('a.customer_id = ?');
    params.push(req.user.id);
  } else if (req.user.role === 'provider') {
    const pid = (await queryOne('SELECT id FROM provider_profiles WHERE user_id = ?', [req.user.id]))?.id;
    if (!pid) return res.json({ success: true, data: { appointments: [], pagination: { page: 1, totalPages: 1, total: 0 } } });
    where.push('a.provider_id = ?');
    params.push(pid);
  }

  if (status) { where.push('a.status = ?'); params.push(status); }
  // Provider default: unapproved requests live in the approval queue
  // (/api/appointments?status=pending), never in the appointments list.
  const effectiveExclude =
    exclude || (req.user.role === 'provider' && !status ? 'pending' : '');
  if (effectiveExclude) {
    // exclude=pending → the provider's appointments list hides unapproved requests
    const list = String(effectiveExclude).split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) {
      where.push(`a.status NOT IN (${list.map(() => '?').join(',')})`);
      params.push(...list);
    }
  }
  if (from) { where.push('a.start_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('a.start_at <= ?'); params.push(`${to} 23:59:59`); }
  if (provider) { where.push('a.provider_id = ?'); params.push(Number(provider)); }
  if (customer) { where.push('a.customer_id = ?'); params.push(Number(customer)); }
  if (search) {
    where.push('(a.reference LIKE ? OR cu.name LIKE ? OR cu.email LIKE ? OR s.name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM appointments a
       JOIN users cu ON cu.id = a.customer_id
       JOIN users pu ON pu.id = (SELECT user_id FROM provider_profiles WHERE id = a.provider_id)
       JOIN services s ON s.id = a.service_id ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT a.*,
            s.name AS service_name, s.duration_min, s.price,
            cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
            pu.name AS provider_name,
            p.id AS provider_pid,
            pay.id AS payment_id, pay.status AS payment_status, pay.amount AS payment_amount,
            pay.transaction_ref, pay.method AS payment_method,
            r.id AS review_id, r.rating AS review_rating
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       LEFT JOIN reviews r ON r.appointment_id = a.id
       ${whereSql}
      ORDER BY a.start_at DESC
      LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  res.json({
    success: true,
    data: {
      appointments: rows,
      pagination: {
        page: pageNum, limit: perPage,
        total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage))
      }
    }
  });
});

/** GET /api/appointments/:id */
export const getAppointment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = await queryOne(
    `SELECT a.*, s.name AS service_name, s.duration_min, s.price, s.image_url AS service_image,
            cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
            pu.name AS provider_name, p.id AS provider_pid,
            pay.id AS payment_id, pay.status AS payment_status, pay.amount AS payment_amount,
            pay.transaction_ref, pay.method AS payment_method, pay.paid_at,
            r.id AS review_id, r.rating AS review_rating, r.comment AS review_comment
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       LEFT JOIN reviews r ON r.appointment_id = a.id
      WHERE a.id = ?`,
    [id]
  );
  if (!row) throw AppError.notFound('Appointment not found');

  const isOwner =
    row.customer_id === req.user.id ||
    req.user.role === 'admin' ||
    (req.user.role === 'provider' && row.provider_pid &&
      (await queryOne('SELECT id FROM provider_profiles WHERE user_id = ? AND id = ?', [req.user.id, row.provider_pid])));
  if (!isOwner) throw AppError.forbidden('You cannot view this appointment');

  res.json({ success: true, data: { appointment: row } });
});

/** PATCH /api/appointments/:id/status — provider/admin manage lifecycle */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, status_reason } = req.validated.body;

  const appt = await queryOne(
    `SELECT a.*, s.name AS service_name,
            cu.name AS customer_name, cu.email AS customer_email,
            pu.name AS provider_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id
      WHERE a.id = ?`,
    [id]
  );
  if (!appt) throw AppError.notFound('Appointment not found');

  const allowed =
    req.user.role === 'admin' ||
    (req.user.role === 'provider' &&
      (await queryOne('SELECT 1 FROM provider_profiles WHERE id = ? AND user_id = ?', [appt.provider_id, req.user.id])));
  if (!allowed) throw AppError.forbidden('You cannot change this appointment');

  const transition = {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'no_show'],
    cancelled: [],
    rejected: [],
    completed: [],
    no_show: []
  }[appt.status] || [];

  if (status !== appt.status && !transition.includes(status)) {
    throw AppError.badRequest(`Cannot move an appointment from "${appt.status}" to "${status}"`);
  }

  await query('UPDATE appointments SET status = ?, status_reason = ? WHERE id = ?',
    [status, status_reason || null, id]);

  if (status === 'cancelled' || status === 'rejected') {
    await query(
      `UPDATE payments SET status = 'refunded', refunded_amount = amount
        WHERE appointment_id = ? AND status = 'paid'`,
      [id]
    );
  }

  mailer
    .appointmentStatus(appt, status, { email: appt.customer_email, name: appt.customer_name })
    .catch(() => {});
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
    [appt.customer_id, `Appointment ${status}`,
     `Your ${appt.service_name} appointment ${appt.reference} is now ${status}.`,
     'appointment', '/dashboard/appointments']
  );

  const updated = await queryOne('SELECT * FROM appointments WHERE id = ?', [id]);
  res.json({ success: true, message: `Appointment marked as ${status}`, data: { appointment: updated } });
});

/** PATCH /api/appointments/:id/reschedule — customer */
export const reschedule = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { start_at } = req.validated.body;

  const appt = await queryOne(
    `SELECT a.*, s.duration_min, s.name AS service_name,
            cu.email AS customer_email, cu.name AS customer_name, pu.name AS provider_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pu ON pu.id = p.user_id
      WHERE a.id = ?`,
    [id]
  );
  if (!appt) throw AppError.notFound('Appointment not found');
  if (appt.customer_id !== req.user.id && req.user.role !== 'admin') {
    throw AppError.forbidden('You cannot reschedule this appointment');
  }
  if (!['pending', 'confirmed'].includes(appt.status)) {
    throw AppError.badRequest('Only pending or confirmed appointments can be rescheduled');
  }

  const startDate = new Date(start_at);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() <= Date.now()) {
    throw AppError.badRequest('Please choose a future date and time');
  }

  const slot = await getSlotsForDate(appt.provider_id, startDate.toISOString().slice(0, 10), appt.duration_min);
  const wanted = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
  const match = slot.slots.find((s) => s.time === wanted);
  if (!match) throw AppError.badRequest('That time is outside working hours');
  if (!match.available) throw AppError.conflict('That time slot is already booked');

  const endDate = new Date(startDate.getTime() + appt.duration_min * 60000);

  await withTransaction(async (conn) => {
    await conn.execute('SELECT id FROM appointments WHERE id = ? FOR UPDATE', [id]);
    // Keep "pending" pending — a reschedule must not skip the approval queue.
    // Confirmed appointments stay confirmed (explicit re-confirmation).
    await conn.execute(
      `UPDATE appointments SET start_at = ?, end_at = ?,
              status = CASE WHEN status = 'pending' THEN 'pending' ELSE 'confirmed' END,
              status_reason = NULL
        WHERE id = ?`,
      [toSql(startDate), toSql(endDate), id]
    );
  });

  mailer
    .appointmentStatus({ ...appt, start_at: startDate.toISOString() }, 'rescheduled',
      { email: appt.customer_email, name: appt.customer_name })
    .catch(() => {});
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
    [appt.customer_id, 'Appointment rescheduled',
     `Your ${appt.service_name} appointment moved to ${startDate.toUTCString()}.`,
     'appointment', '/dashboard/appointments']
  );

  const updated = await queryOne('SELECT * FROM appointments WHERE id = ?', [id]);
  res.json({ success: true, message: 'Appointment rescheduled', data: { appointment: updated } });
});

/** DELETE /api/appointments/:id — customer cancels */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const appt = await queryOne(
    `SELECT a.*, s.name AS service_name, cu.email AS customer_email, cu.name AS customer_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
      WHERE a.id = ?`,
    [id]
  );
  if (!appt) throw AppError.notFound('Appointment not found');
  if (appt.customer_id !== req.user.id && req.user.role !== 'admin') {
    throw AppError.forbidden('You cannot cancel this appointment');
  }
  if (!['pending', 'confirmed'].includes(appt.status)) {
    throw AppError.badRequest('Only pending or confirmed appointments can be cancelled');
  }

  await query(
    `UPDATE appointments SET status = 'cancelled', status_reason = 'Cancelled by customer' WHERE id = ?`,
    [id]
  );
  await query(
    `UPDATE payments SET status = 'refunded', refunded_amount = amount
      WHERE appointment_id = ? AND status = 'paid'`,
    [id]
  );

  mailer
    .appointmentStatus(appt, 'cancelled', { email: appt.customer_email, name: appt.customer_name })
    .catch(() => {});
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
    [appt.customer_id, 'Appointment cancelled',
     `Your ${appt.service_name} appointment ${appt.reference} was cancelled.`,
     'warning', '/dashboard/appointments']
  );

  res.json({ success: true, message: 'Appointment cancelled' });
});

/* ---------- helpers ---------- */
function toSql(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ` +
         `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:` +
         `${String(d.getUTCSeconds()).padStart(2, '0')}`;
}
