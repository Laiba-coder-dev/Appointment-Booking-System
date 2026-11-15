import { query, queryOne, withTransaction } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';
import paymentService from '../services/payment.service.js';
import mailer from '../services/email.service.js';

/** POST /api/payments — create a payment intent for an appointment */
export const createPayment = asyncHandler(async (req, res) => {
  const { appointment_id, method } = req.validated.body;

  const appt = await queryOne(
    `SELECT a.*, s.name AS service_name, s.price,
            cu.email AS customer_email, cu.name AS customer_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users cu ON cu.id = a.customer_id
      WHERE a.id = ?`,
    [appointment_id]
  );
  if (!appt) throw AppError.notFound('Appointment not found');
  if (appt.customer_id !== req.user.id) throw AppError.forbidden('You cannot pay for this appointment');
  if (['cancelled', 'rejected'].includes(appt.status)) {
    throw AppError.badRequest('This appointment can no longer be paid for');
  }

  const existing = await queryOne(
    `SELECT * FROM payments WHERE appointment_id = ? AND status IN ('pending','paid')
      ORDER BY id DESC LIMIT 1`,
    [appointment_id]
  );
  if (existing?.status === 'paid') {
    throw AppError.conflict('This appointment has already been paid for');
  }

  const amount = Number(appt.price);
  const intent = await paymentService.createIntent({
    amount,
    currency: 'usd',
    appointmentReference: appt.reference,
    metadata: { appointmentId: appt.id, customerEmail: appt.customer_email }
  });

  let payment;
  if (existing) {
    await query(
      `UPDATE payments SET method = ?, transaction_ref = ?, stripe_payment_intent = ?, amount = ? WHERE id = ?`,
      [method, intent.transactionRef, intent.transactionRef, amount, existing.id]
    );
    payment = await queryOne('SELECT * FROM payments WHERE id = ?', [existing.id]);
  } else {
    const r = await query(
      `INSERT INTO payments (appointment_id, amount, currency, method, status, transaction_ref, stripe_payment_intent)
       VALUES (?,?,?,?, 'pending', ?, ?)`,
      [appointment_id, amount, 'USD', method, intent.transactionRef, intent.transactionRef]
    );
    payment = await queryOne('SELECT * FROM payments WHERE id = ?', [r.insertId]);
  }

  res.status(201).json({
    success: true,
    data: { payment, intent }
  });
});

/** POST /api/payments/confirm */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { payment_id, transaction_ref, mode } = req.validated.body;

  const payment = await queryOne(
    `SELECT pay.*, a.reference, a.customer_id, a.provider_id, a.service_id, a.start_at,
            s.name AS service_name, u.email AS customer_email, u.name AS customer_name,
            pu.id AS provider_user_id
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN services s ON s.id = a.service_id
       JOIN users u ON u.id = a.customer_id
       JOIN provider_profiles pp ON pp.id = a.provider_id
       JOIN users pu ON pu.id = pp.user_id
      WHERE pay.id = ?`,
    [payment_id]
  );
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.customer_id !== req.user.id && req.user.role !== 'admin') {
    throw AppError.forbidden('You cannot confirm this payment');
  }
  if (payment.status === 'paid') return res.json({ success: true, message: 'Already paid', data: { payment } });

  const result = await paymentService.confirm({
    transactionRef: transaction_ref || payment.transaction_ref,
    mode
  });

  if (result.status !== 'paid') {
    await query(`UPDATE payments SET status = 'failed' WHERE id = ?`, [payment.id]);
    throw AppError.badRequest(result.message || 'Payment failed. Please try again.');
  }

  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE payments SET status = 'paid', paid_at = NOW(), transaction_ref = ? WHERE id = ?`,
      [result.transactionRef || payment.transaction_ref, payment.id]
    );
    // NOTE: payment does NOT confirm the appointment — every booking waits for
    // the professional's approval (pending → confirmed/rejected) in their
    // "Booking requests" queue. A later rejection auto-refunds this payment.
    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
      [payment.customer_id, 'Payment received',
       `Payment of ${payment.currency} ${Number(payment.amount).toFixed(2)} received for ${payment.reference}.`,
       'payment', '/dashboard/payments']
    );
    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
      [payment.provider_user_id, 'Booking payment received',
       `Payment received for ${payment.reference} — approve or decline the request.`,
       'appointment', '/provider/requests']
    );
  });

  const appt = await queryOne(
    `SELECT a.*, s.name AS service_name, u.email AS customer_email, u.name AS customer_name
       FROM appointments a JOIN services s ON s.id = a.service_id JOIN users u ON u.id = a.customer_id
      WHERE a.id = ?`,
    [payment.appointment_id]
  );
  mailer.paymentReceipt({ ...payment, status: 'paid', transaction_ref: result.transactionRef }, appt,
    { email: payment.customer_email, name: payment.customer_name }).catch(() => {});
  // The appointment stays "pending" until the professional approves it — no
  // confirmation email yet; updateStatus() sends that on approval.

  const updated = await queryOne('SELECT * FROM payments WHERE id = ?', [payment.id]);
  const appointment = await queryOne('SELECT * FROM appointments WHERE id = ?', [payment.appointment_id]);
  res.json({ success: true, message: 'Payment received — your request is awaiting the professional\'s approval', data: { payment: updated, appointment } });
});

/** GET /api/payments — history (customer = own, provider = their appointments, admin = all) */
export const listPayments = asyncHandler(async (req, res) => {
  const { status = '', page = 1, limit = 10, from, to, search = '' } = req.query;
  const params = [];
  const where = [];

  if (req.user.role === 'customer') { where.push('a.customer_id = ?'); params.push(req.user.id); }
  else if (req.user.role === 'provider') {
    const pid = (await queryOne('SELECT id FROM provider_profiles WHERE user_id = ?', [req.user.id]))?.id;
    where.push('a.provider_id = ?'); params.push(pid || 0);
  }
  if (status) { where.push('pay.status = ?'); params.push(status); }
  if (from) { where.push('pay.created_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('pay.created_at <= ?'); params.push(`${to} 23:59:59`); }
  if (search) {
    where.push('(pay.transaction_ref LIKE ? OR a.reference LIKE ? OR u.name LIKE ?)');
    const like = `%${search}%`; params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Number(limit) || 10);

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id ${whereSql}`, params);

  const rows = await query(
    `SELECT pay.*, a.reference AS appointment_reference, a.start_at, a.status AS appointment_status,
            u.name AS customer_name, u.email AS customer_email, s.name AS service_name,
            pr.name AS provider_name
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id
       JOIN services s ON s.id = a.service_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pr ON pr.id = p.user_id
       ${whereSql}
      ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, (pageNum - 1) * perPage]
  );

  const summary = await queryOne(
    `SELECT COALESCE(SUM(pay.amount),0) AS gross,
            COALESCE(SUM(CASE WHEN pay.status='refunded' THEN pay.refunded_amount END),0) AS refunded
       FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
       ${whereSql ? whereSql + ' AND pay.status = \'paid\'' : 'WHERE pay.status = \'paid\''}`,
    params
  );

  res.json({
    success: true,
    data: {
      payments: rows,
      summary,
      pagination: { page: pageNum, limit: perPage, total: countRow?.total || 0,
        totalPages: Math.max(1, Math.ceil((countRow?.total || 0) / perPage)) }
    }
  });
});

/** POST /api/payments/:id/refund — admin */
export const refundPayment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payment = await queryOne(
    `SELECT pay.*, a.reference, a.customer_id FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id WHERE pay.id = ?`, [id]);
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.status !== 'paid') throw AppError.badRequest('Only captured payments can be refunded');

  const amount = req.validated.body.amount ?? Number(payment.amount);
  if (amount > Number(payment.amount)) throw AppError.badRequest('Refund exceeds the original amount');

  const result = await paymentService.refund({ transactionRef: payment.transaction_ref, amount });

  const fullyRefunded = amount >= Number(payment.amount);
  await query(
    `UPDATE payments SET status = ?, refunded_amount = ? WHERE id = ?`,
    [fullyRefunded ? 'refunded' : 'partially_refunded', amount, id]
  );
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)`,
    [payment.customer_id, 'Refund processed',
     `A refund of ${payment.currency} ${amount.toFixed(2)} was issued for ${payment.reference}.`,
     'payment', '/dashboard/payments']
  );

  res.json({ success: true, message: result.message, data: { payment: await queryOne('SELECT * FROM payments WHERE id = ?', [id]) } });
});

/** GET /api/payments/:id/receipt — receipt payload for PDF/print */
export const getReceipt = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = await queryOne(
    `SELECT pay.*, a.reference AS appointment_reference, a.start_at, a.end_at, a.status AS appointment_status,
            u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            s.name AS service_name, s.duration_min, pr.name AS provider_name
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN users u ON u.id = a.customer_id
       JOIN services s ON s.id = a.service_id
       JOIN provider_profiles p ON p.id = a.provider_id
       JOIN users pr ON pr.id = p.user_id
      WHERE pay.id = ?`, [id]);
  if (!row) throw AppError.notFound('Receipt not found');
  if (req.user.role === 'customer' && row.customer_email !== req.user.email) {
    throw AppError.forbidden('You cannot view this receipt');
  }
  res.json({ success: true, data: { receipt: row } });
});
