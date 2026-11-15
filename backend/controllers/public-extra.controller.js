import { query } from '../config/db.js';
import { AppError } from '../utilities/AppError.js';
import { asyncHandler } from '../middleware/error.js';
import mailer from '../services/email.service.js';

/** POST /api/contact — public contact form */
export const contact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || String(name).trim().length < 2) {
    throw AppError.validation('Please enter your name', [
      { field: 'name', message: 'Please enter your name' }
    ]);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    throw AppError.validation('Enter a valid email address', [
      { field: 'email', message: 'Enter a valid email address' }
    ]);
  }
  if (!subject || String(subject).trim().length < 3) {
    throw AppError.validation('Please add a subject', [
      { field: 'subject', message: 'Please add a subject' }
    ]);
  }
  if (!message || String(message).trim().length < 10) {
    throw AppError.validation('Message must be at least 10 characters', [
      { field: 'message', message: 'Message must be at least 10 characters' }
    ]);
  }

  // Deliver to the Appointify support inbox via the mail service
  // (console transport in development, SMTP when configured).
  await mailer.send({
    to: process.env.SUPPORT_INBOX || 'hello@appointify.com',
    subject: `[Contact] ${subject}`,
    html: `
      <h2 style="color:#641E32">New contact message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr/>
      <p style="white-space:pre-wrap">${message}</p>`,
    text: `${name} <${email}> — ${subject}\n\n${message}`
  }).catch(() => {});

  // Store in notifications so the admin sees it in-app too.
  const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
  for (const a of admins) {
    await query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)',
      [a.id, `Contact: ${subject}`, `${name} (${email}): ${String(message).slice(0, 240)}`, 'info', '/admin']
    );
  }

  res.status(201).json({
    success: true,
    message: 'Thanks — your message has been sent. We will reply within one business day.'
  });
});

/** GET /api/faq — optional CMS-driven FAQ list (falls back to defaults client-side) */
export const faq = asyncHandler(async (_req, res) => {
  // Reserved for a future FAQ admin module; empty array → client defaults.
  res.json({ success: true, data: { faqs: [] } });
});
