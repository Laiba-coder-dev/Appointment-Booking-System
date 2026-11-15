import nodemailer from 'nodemailer';

/**
 * Email service.
 * - If SMTP_* env vars are configured → sends real email.
 * - Otherwise → logs the message to the console (dev mode) so the
 *   notification flow is still fully exercised end-to-end.
 */

let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT } = process.env;
  if (SMTP_HOST && SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return transporter;
}

const BRAND = {
  name: 'Appointify',
  primary: '#641E32',
  dark: '#481421',
  ivory: '#FFF9F0',
  cream: '#F8EFE6',
  border: '#E9DDD7',
  charcoal: '#2A2A2A',
  muted: '#756B68'
};

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.dark};padding:26px 32px;">
            <div style="font-size:24px;letter-spacing:3px;color:${BRAND.ivory};font-weight:bold;">APPOINTIFY</div>
            <div style="font-size:12px;letter-spacing:2px;color:${BRAND.soft || '#D6A6A9'};margin-top:4px;">${title}</div>
          </td>
        </tr>
        <tr><td style="padding:32px;color:${BRAND.charcoal};font-size:15px;line-height:1.7;">
          ${bodyHtml}
        </td></tr>
        <tr>
          <td style="background:${BRAND.ivory};padding:20px 32px;border-top:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted};">
            © ${new Date().getFullYear()} Appointify · Your Time. Your Schedule. Your Way.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function send({ to, subject, html, text }) {
  const tx = getTransporter();
  const from = process.env.MAIL_FROM || 'Appointify <no-reply@appointify.app>';
  if (tx) {
    try {
      await tx.sendMail({ from, to, subject, html, text });
      return { delivered: true, mode: 'smtp' };
    } catch (err) {
      console.error('[MAIL] SMTP send failed:', err.message);
      console.log(`[MAIL→console] To: ${to} | Subject: ${subject}`);
      return { delivered: false, mode: 'smtp-failed' };
    }
  }
  console.log(`\n[MAIL→console] To: ${to}\n[MAIL→console] Subject: ${subject}`);
  return { delivered: false, mode: 'console' };
}

export const mailer = {
  /** Generic escape hatch for ad-hoc messages (contact form, alerts…). */
  async send({ to, subject, html, text }) {
    return send({ to, subject, html, text });
  },

  async welcome(user) {
    return send({
      to: user.email,
      subject: 'Welcome to Appointify',
      html: layout(
        'WELCOME',
        `<h2 style="color:${BRAND.primary};margin:0 0 12px;">Hello ${user.name || ''},</h2>
         <p>Welcome to <strong>Appointify</strong> — your premium scheduling platform.</p>
         <p>Your account has been created successfully as a
         <strong>${user.role === 'provider' ? 'Service Provider' : user.role === 'admin' ? 'Administrator' : 'Customer'}</strong>.</p>
         <p style="margin-top:24px;">
           <a href="${process.env.CLIENT_URL}/login"
              style="background:${BRAND.primary};color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;display:inline-block;">
              Sign in to Appointify
           </a>
         </p>`
      ),
      text: `Welcome to Appointify, ${user.name}. Your ${user.role} account is ready.`
    });
  },

  async appointmentConfirmation(appt, extras = {}) {
    const when = new Date(appt.start_at).toUTCString();
    return send({
      to: extras.email,
      subject: `Appointment Confirmed — ${appt.reference}`,
      html: layout(
        'APPOINTMENT CONFIRMED',
        `<h2 style="color:${BRAND.primary};margin:0 0 12px;">You're booked, ${extras.name || ''}!</h2>
         <p>Your appointment has been <strong>confirmed</strong>.</p>
         <table style="width:100%;border-collapse:collapse;margin:18px 0;">
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Reference</td>
               <td style="padding:8px 0;font-weight:bold;">${appt.reference}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Service</td>
               <td style="padding:8px 0;">${appt.service_name || ''}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Professional</td>
               <td style="padding:8px 0;">${appt.provider_name || ''}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">When</td>
               <td style="padding:8px 0;">${when}</td></tr>
         </table>
         <p><a href="${process.env.CLIENT_URL}/dashboard/appointments"
            style="color:${BRAND.primary};font-weight:bold;">View in your dashboard →</a></p>`
      ),
      text: `Appointment ${appt.reference} confirmed for ${when}.`
    });
  },

  async appointmentStatus(appt, status, extras = {}) {
    const when = new Date(appt.start_at).toUTCString();
    const verb = {
      cancelled: 'has been cancelled',
      rejected: 'has been rejected by the provider',
      rescheduled: 'has been rescheduled',
      completed: 'has been marked as completed',
      confirmed: 'has been confirmed'
    }[status] || `status changed to ${status}`;

    return send({
      to: extras.email,
      subject: `Appointment ${status.toUpperCase()} — ${appt.reference}`,
      html: layout(
        `APPOINTMENT ${status.toUpperCase()}`,
        `<h2 style="color:${BRAND.primary};margin:0 0 12px;">Hello ${extras.name || ''},</h2>
         <p>Your appointment <strong>${appt.reference}</strong> ${verb}.</p>
         <p><strong>Service:</strong> ${appt.service_name || ''}<br/>
            <strong>When:</strong> ${when}</p>
         ${appt.status_reason ? `<p><strong>Note:</strong> ${appt.status_reason}</p>` : ''}
         <p><a href="${process.env.CLIENT_URL}/dashboard/appointments"
            style="color:${BRAND.primary};font-weight:bold;">Open dashboard →</a></p>`
      ),
      text: `Appointment ${appt.reference} ${verb}.`
    });
  },

  async paymentReceipt(payment, appt, extras = {}) {
    return send({
      to: extras.email,
      subject: `Receipt for ${payment.transaction_ref} — Appointify`,
      html: layout(
        'PAYMENT RECEIPT',
        `<h2 style="color:${BRAND.primary};margin:0 0 12px;">Thank you, ${extras.name || ''}</h2>
         <p>We've received your payment.</p>
         <table style="width:100%;border-collapse:collapse;margin:18px 0;">
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Transaction</td>
               <td style="padding:8px 0;">${payment.transaction_ref}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Appointment</td>
               <td style="padding:8px 0;">${appt.reference}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Amount</td>
               <td style="padding:8px 0;font-weight:bold;">${payment.currency} ${Number(payment.amount).toFixed(2)}</td></tr>
           <tr><td style="padding:8px 0;color:${BRAND.muted};">Status</td>
               <td style="padding:8px 0;">${payment.status}</td></tr>
         </table>`
      ),
      text: `Payment ${payment.transaction_ref} received: ${payment.currency} ${payment.amount}`
    });
  },

  async reminder(appt, extras = {}) {
    const when = new Date(appt.start_at).toUTCString();
    return send({
      to: extras.email,
      subject: `Reminder: your appointment is coming up — ${appt.reference}`,
      html: layout(
        'APPOINTMENT REMINDER',
        `<h2 style="color:${BRAND.primary};margin:0 0 12px;">See you soon, ${extras.name || ''}!</h2>
         <p>This is a friendly reminder of your upcoming appointment.</p>
         <p><strong>${appt.service_name || ''}</strong><br/>${when}</p>`
      ),
      text: `Reminder: appointment ${appt.reference} at ${when}.`
    });
  }
};

export default mailer;
