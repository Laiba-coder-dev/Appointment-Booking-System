/**
 * Availability engine.
 * Derives bookable slots from provider_availability, unavailable_dates
 * and existing (active) appointments — so double bookings are impossible.
 */
import { query } from '../config/db.js';

const ACTIVE_STATUSES = ['pending', 'confirmed'];

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const minutesToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

function timeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Get bookable slots for a provider on a given date.
 * @param {number} providerId
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} [durationMin] service duration — used for slot collision checks
 * @returns {Promise<{date:string, slots:Array<{time:string,end:string,available:boolean}>, blocked:boolean}>}
 */
export async function getSlotsForDate(providerId, dateStr, durationMin = 30) {
  const day = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) throw new Error('Invalid date');
  const dow = day.getUTCDay();

  const [availability, blockedDays, appts] = await Promise.all([
    query(
      'SELECT start_time, end_time, slot_interval_min FROM provider_availability WHERE provider_id = ? AND day_of_week = ? AND is_active = 1',
      [providerId, dow]
    ),
    query(
      'SELECT 1 FROM unavailable_dates WHERE provider_id = ? AND unavailable_date = ? LIMIT 1',
      [providerId, dateStr]
    ),
    query(
      `SELECT start_at, end_at FROM appointments
        WHERE provider_id = ? AND DATE(start_at) = ? AND status IN (?, ?)`,
      [providerId, dateStr, ...ACTIVE_STATUSES]
    )
  ]);

  if (blockedDays.length) {
    return { date: dateStr, blocked: true, slots: [], reason: 'Provider unavailable' };
  }
  if (!availability.length) {
    return { date: dateStr, blocked: false, slots: [], reason: 'Not a working day' };
  }

  const taken = appts.map((a) => ({
    start: new Date(a.start_at).getUTCHours() * 60 + new Date(a.start_at).getUTCMinutes(),
    end: new Date(a.end_at).getUTCHours() * 60 + new Date(a.end_at).getUTCMinutes()
  }));

  const slots = [];
  for (const window of availability) {
    const interval = Number(window.slot_interval_min) || 60;
    const from = timeToMinutes(window.start_time);
    const to = timeToMinutes(window.end_time);

    for (let t = from; t + durationMin <= to; t += interval) {
      const end = t + durationMin;
      const collides = taken.some((s) => t < s.end && end > s.start);
      const isPast =
        new Date(`${dateStr}T${minutesToTime(t)}:00Z`).getTime() <= Date.now();

      slots.push({
        time: minutesToTime(t),
        end: minutesToTime(end),
        available: !collides && !isPast
      });
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time));
  return { date: dateStr, blocked: false, slots };
}

/** Generate slots across a range of dates (used by the booking calendar). */
export async function getAvailabilityRange(providerId, startDate, days = 30, durationMin = 30) {
  const out = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = dateKey(d);
    const info = await getSlotsForDate(providerId, key, durationMin);
    out.push({
      date: key,
      blocked: info.blocked,
      reason: info.reason,
      availableCount: info.slots.filter((s) => s.available).length
    });
  }
  return out;
}

export { dateKey };
