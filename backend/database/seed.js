/**
 * APPOINTIFY — Development seed data
 * Creates realistic burgundy-brand demo data for every role.
 * Idempotent: safe to re-run (skips if the database is already seeded).
 */
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST = '127.0.0.1', DB_PORT = '3306', DB_USER = 'root',
  DB_PASSWORD = '', DB_NAME = 'appointify'
} = process.env;

const pad = (n) => String(n).padStart(2, '0');
const sqlDate = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

async function seed() {
  const conn = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, multipleStatements: true
  });

  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM users');
  if (n > 0) {
    console.log(`Database already seeded (${n} users). Delete the database to re-seed.`);
    await conn.end();
    return;
  }

  console.log('Seeding Appointify…');
  const hash = await bcrypt.hash('Password123!', 12);
  const now = Date.now();

  /* ---------------- Users ---------------- */
  const insertUser = async (name, email, role, phone, extra = {}) => {
    const [r] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, phone, avatar_url, is_active, email_verified, last_login_at) VALUES (?,?,?,?,?,?,1,1,NOW())',
      [name, email, hash, role, phone, extra.avatar || null]
    );
    return r.insertId;
  };

  const adminId = await insertUser('Amelia Hart', 'admin@appointify.com', 'admin', '+1 415 555 0100',
    { avatar: 'https://i.pravatar.cc/160?img=47' });
  await insertUser('Amelia Hart', 'amelia@appointify.com', 'customer', '+1 415 555 0101', { avatar: 'https://i.pravatar.cc/160?img=45' });
  await conn.execute('INSERT INTO customer_profiles (user_id, city, country, gender) VALUES (?,?,?,?)',
    [2, 'San Francisco', 'USA', 'female']);

  const customers = [
    ['Sofia Bennett', 'sofia@example.com', '+1 212 555 0142', 'New York', 'https://i.pravatar.cc/160?img=32'],
    ['Marcus Chen', 'marcus@example.com', '+1 212 555 0177', 'Boston', 'https://i.pravatar.cc/160?img=12'],
    ['Elena Rossi', 'elena@example.com', '+1 305 555 0119', 'Miami', 'https://i.pravatar.cc/160?img=44'],
    ['David Okafor', 'david@example.com', '+1 312 555 0163', 'Chicago', 'https://i.pravatar.cc/160?img=68'],
    ['Priya Nair', 'priya@example.com', '+1 206 555 0188', 'Seattle', 'https://i.pravatar.cc/160?img=25'],
    ['James Whitfield', 'james@example.com', '+1 702 555 0134', 'Las Vegas', 'https://i.pravatar.cc/160?img=59']
  ];
  const customerIds = [];
  for (const [name, email, phone, city, avatar] of customers) {
    const id = await insertUser(name, email, 'customer', phone, { avatar });
    await conn.execute('INSERT INTO customer_profiles (user_id, city, country) VALUES (?,?,?)', [id, city, 'USA']);
    customerIds.push(id);
  }

  /* ---------------- Categories ---------------- */
  const cats = [
    ['Wellness & Spa', 'wellness-spa', 'Restorative treatments for body and mind.', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'],
    ['Beauty & Aesthetics', 'beauty-aesthetics', 'Expert beauty treatments and consultations.', 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&q=80'],
    ['Medical & Health', 'medical-health', 'Licensed clinicians and preventive care.', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80'],
    ['Fitness & Coaching', 'fitness-coaching', 'Personal training and performance coaching.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
    ['Consulting & Strategy', 'consulting-strategy', 'Business advisory and career sessions.', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80'],
    ['Hair & Grooming', 'hair-grooming', 'Precision cuts, colouring and grooming.', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80']
  ];
  const catIds = [];
  for (let i = 0; i < cats.length; i++) {
    const [name, slug, desc, img] = cats[i];
    const [r] = await conn.execute(
      'INSERT INTO service_categories (name, slug, description, image_url, sort_order) VALUES (?,?,?,?,?)',
      [name, slug, desc, img, i]);
    catIds.push(r.insertId);
  }

  /* ---------------- Providers ---------------- */
  const providerDefs = [
    ['Dr. Isabelle Moreau', 'isabelle@appointify.com', '+1 415 555 0201', 'Clinical Aesthetics Specialist',
      'Dermatology & Skin Health', 12, 'Advanced skin health protocols with a decade of clinical practice.',
      180, 'San Francisco, CA', 1, 'approved', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80'],
    ['Marcus Delaney', 'c', '+1 415 555 0202', 'Master Barber & Grooming Artist',
      'Hair & Grooming', 9, 'Editorial-level precision cutting and classic barbering.',
      95, 'New York, NY', 1, 'approved', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'],
    ['Naomi Sato', 'naomi@appointify.com', '+1 415 555 0203', 'Wellness & Massage Therapist',
      'Holistic Wellness', 7, 'Deep-tissue and lymphatic drainage specialist.',
      120, 'Los Angeles, CA', 1, 'approved', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80'],
    ['Dr. Omar Haddad', 'omar@appointify.com', '+1 415 555 0204', 'Internal Medicine Physician',
      'Preventive Medicine', 15, 'Physician focused on longevity and preventive screening.',
      220, 'Chicago, IL', 1, 'approved', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80'],
    ['Camille Dubois', 'camille@appointify.com', '+1 415 555 0205', 'Executive Career Coach',
      'Career & Leadership', 8, 'Former Fortune-500 talent director turned coach.',
      200, 'Austin, TX', 1, 'approved', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80'],
    ['Lucas Ferreira', 'lucas@appointify.com', '+1 415 555 0206', 'Strength & Conditioning Coach',
      'Performance Fitness', 6, 'Sports science-led programming for athletes.',
      110, 'Miami, FL', 0, 'approved', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80'],
    ['Aisha Rahman', 'aisha@appointify.com', '+1 415 555 0207', 'Nutrition & Lifestyle Dietitian',
      'Clinical Nutrition', 10, 'Registered dietitian specialising in metabolic health.',
      140, 'Seattle, WA', 0, 'pending', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80'],
    ['Théo Lambert', 'theo@appointify.com', '+1 415 555 0208', 'Colour Specialist',
      'Hair Colour Artistry', 11, 'Balayage and colour-correction artist.',
      130, 'Paris / Remote', 0, 'pending', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80']
  ];

  const providerIds = [];
  for (let i = 0; i < providerDefs.length; i++) {
    const [name, email, phone, headline, spec, years, bio, rate, location, featured, approval, avatar] = providerDefs[i];
    const uid = await insertUser(name, email, 'provider', phone, { avatar });
    const [r] = await conn.execute(
      `INSERT INTO provider_profiles
         (user_id, headline, bio, specialization, experience_years, hourly_rate, approval_status, is_featured, location, rating_avg, review_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
      [uid, headline, bio, spec, years, rate, approval, featured, location, 0]);
    providerIds.push({ id: r.insertId, userId: uid, name, email, approved: approval === 'approved' });
  }

  /* ---------------- Services ---------------- */
  const svcDefs = [
    [0, 'Signature Deep Tissue Massage', 'A 60-minute targeted massage releasing chronic tension with warm oil and firm pressure.', 60, 120, 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'],
    [0, 'Luxury Facial Ritual', 'Double cleanse, enzymatic exfoliation, custom mask and sculpting massage.', 75, 165, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80'],
    [0, 'Aromatherapy Recovery', 'Essential-oil guided session combining breathwork and light bodywork.', 45, 95, 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80'],
    [1, 'Precision Haircut & Style', 'Consultation, cut, wash and finish tailored to your face shape.', 45, 85, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80'],
    [1, 'Balayage Colour Artistry', 'Hand-painted lightening with gloss treatment and blow-dry.', 150, 280, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'],
    [1, 'Hydra-Glow Facial', 'Medical-grade hydration for luminous, plumped skin.', 60, 145, 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80'],
    [2, 'Annual Health Screening', 'Comprehensive blood panel, vitals and physician consult.', 90, 250, 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80'],
    [2, 'Dermatology Consultation', 'Full skin examination with digital mole mapping.', 40, 195, 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80'],
    [2, 'Nutritional Assessment', 'Metabolic review and personalised meal strategy.', 60, 140, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80'],
    [3, 'Personal Training Session', 'One-to-one strength coaching with movement assessment.', 60, 110, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
    [3, 'Mobility & Recovery Class', 'Guided mobility, foam rolling and breathwork.', 50, 70, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80'],
    [4, 'Executive Strategy Session', '90-minute deep-dive on your business roadmap.', 90, 320, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80'],
    [4, 'Career Clarity Coaching', 'Values audit, positioning and interview preparation.', 60, 180, 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80'],
    [4, 'Interview Preparation Lab', 'Mock interviews with structured feedback report.', 45, 150, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80'],
    [5, 'Classic Barbering Service', 'Hot-towel shave, precision cut and beard sculpt.', 40, 75, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80'],
    [5, 'Beard Design & Grooming', 'Line-up, conditioning oil and shape refinement.', 30, 55, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80'],
    [0, 'Couples Relaxation Retreat', 'Side-by-side massage with champagne and canapés.', 90, 340, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80'],
    [3, 'Posture & Alignment Assessment', 'Full kinetic screening with a corrective plan.', 50, 130, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80']
  ];

  const serviceIds = [];
  const slugSet = new Set();
  for (const [ci, name, desc, dur, price, img] of svcDefs) {
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let s = slug, i = 1;
    while (slugSet.has(s)) s = `${slug}-${i++}`;
    slugSet.add(s);
    const [r] = await conn.execute(
      `INSERT INTO services (category_id, name, slug, description, duration_min, price, image_url, is_active)
       VALUES (?,?,?,?,?,?,?,1)`,
      [catIds[ci], name, s, desc, dur, price, img]);
    serviceIds.push({ id: r.insertId, dur, price, cat: ci, name });
  }

  /* ---- link services to providers (provider_services) ---- */
  const links = [
    [0, [0, 2, 16]], [1, [1, 5]], [2, [5, 10]], [3, [3, 14]],
    [4, [4, 12, 13]], [5, [9, 17]], [6, [6, 8]], [7, [7, 15]]
  ];
  for (const [pi, sIdxs] of links) {
    const prov = providerIds[pi];
    if (!prov.approved) continue;
    for (const si of sIdxs) {
      await conn.execute(
        'INSERT INTO provider_services (provider_id, service_id, custom_price, custom_duration) VALUES (?,?,?,?)',
        [prov.id, serviceIds[si].id, serviceIds[si].price, serviceIds[si].dur]);
    }
  }

  /* ---------------- Availability (Mon–Sat for approved providers) ---------------- */
  for (const prov of providerIds) {
    if (!prov.approved) continue;
    const windows = [
      [1, '09:00:00', '17:00:00'], [2, '09:00:00', '17:00:00'], [3, '10:00:00', '19:00:00'],
      [4, '09:00:00', '16:00:00'], [5, '08:00:00', '15:00:00'], [6, '10:00:00', '14:00:00']
    ];
    for (const [dow, s, e] of windows) {
      await conn.execute(
        'INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, slot_interval_min, is_active) VALUES (?,?,?,?,?,1)',
        [prov.id, dow, s, e, 60]);
    }
  }

  /* ---------------- Appointments across the last/next 8 weeks ---------------- */
  const statuses = ['completed', 'completed', 'completed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'completed'];
  let refCounter = 1000;
  const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeRef = () => {
    let s = 'APT-';
    for (let i = 0; i < 8; i++) s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
    return s;
  };

  const appointmentRows = [];
  for (let dayOffset = -56; dayOffset <= 28; dayOffset++) {
    const base = new Date(now + dayOffset * 86400000);
    const dow = base.getUTCDay();
    if (dow === 0) continue; // no Sunday bookings

    const count = dayOffset < 0 ? 2 + Math.floor(Math.random() * 3) : (dayOffset < 7 ? 3 : 1);
    for (let k = 0; k < count; k++) {
      const prov = providerIds.filter((p) => p.approved)[Math.floor(Math.random() * providerIds.filter((p) => p.approved).length)];
      const svcIdxs = links.find(([pi]) => pi === providerIds.indexOf(prov))?.[1];
      if (!svcIdxs) continue;
      const svc = serviceIds[svcIdxs[Math.floor(Math.random() * svcIdxs.length)]];
      const custId = customerIds[Math.floor(Math.random() * customerIds.length)];

      const hour = 9 + Math.floor(Math.random() * 7);
      const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, Math.random() > 0.5 ? 0 : 30));
      const end = new Date(start.getTime() + svc.dur * 60000);

      let status = statuses[Math.floor(Math.random() * statuses.length)];
      if (dayOffset > 3) status = Math.random() > 0.4 ? 'pending' : 'confirmed';
      if (dayOffset === 0 && status === 'completed') status = 'confirmed';

      const reference = makeRef();
      try {
        const [r] = await conn.execute(
          `INSERT INTO appointments (reference, customer_id, provider_id, service_id, start_at, end_at, status, notes, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [reference, custId, prov.id, svc.id, sqlDate(start), sqlDate(end), status,
           'Please arrive 10 minutes early.', sqlDate(new Date(start.getTime() - 7 * 86400000))]);
        appointmentRows.push({ id: r.insertId, status, amount: svc.price, start, reference, custId, provId: prov.id, svcName: svc.name, provName: prov.name });
        refCounter++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err; // skip duplicate slots
      }
    }
  }

  /* ---------------- Payments ---------------- */
  for (const a of appointmentRows) {
    if (a.status === 'cancelled' || a.status === 'pending' && Math.random() > 0.5) {
      if (Math.random() > 0.6) {
        await conn.execute(
          `INSERT INTO payments (appointment_id, amount, currency, method, status, transaction_ref, created_at, paid_at)
           VALUES (?,?, 'USD', 'card', 'refunded', ?, ?, ?)`,
          [a.id, a.amount, `txn_${Math.random().toString(36).slice(2, 14)}`,
           sqlDate(new Date(a.start.getTime() - 3 * 86400000)), sqlDate(new Date(a.start.getTime() - 3 * 86400000))]);
      }
      continue;
    }
    if (a.status === 'pending') continue;

    const paid = a.status !== 'cancelled';
    const createdAt = new Date(a.start.getTime() - 5 * 86400000);
    await conn.execute(
      `INSERT INTO payments (appointment_id, amount, currency, method, status, transaction_ref, stripe_payment_intent, created_at, paid_at)
       VALUES (?,?, 'USD', 'card', ?, ?, ?, ?, ?)`,
      [a.id, a.amount, paid ? 'paid' : 'failed',
       `txn_${Math.random().toString(36).slice(2, 14)}`,
       `pi_${Math.random().toString(36).slice(2, 16)}`,
       sqlDate(createdAt), paid ? sqlDate(createdAt) : null]);
  }

  /* ---------------- Reviews ---------------- */
  const comments = [
    'Absolutely wonderful experience — the attention to detail was remarkable.',
    'Professional, warm and extremely skilled. I have already rebooked.',
    'Beautiful space and a genuinely restorative session. Highly recommend.',
    'Punctual, knowledgeable and friendly. Exactly what I was looking for.',
    'Exceeded my expectations. The results were visible immediately.',
    'Great communication before and after the appointment. Five stars.',
    'A premium experience from start to finish. Worth every penny.',
    'Very thorough and explained everything clearly. Feeling fantastic.'
  ];
  const completed = appointmentRows.filter((a) => a.status === 'completed');
  for (const a of completed) {
    if (Math.random() > 0.55) continue;
    const rating = Math.random() > 0.2 ? 5 : 4;
    try {
      await conn.execute(
        `INSERT INTO reviews (appointment_id, customer_id, provider_id, service_id, rating, comment, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [a.id, a.custId, a.provId,
         (serviceIds.find((s) => s.name === a.svcName) || serviceIds[0]).id,
         rating, comments[Math.floor(Math.random() * comments.length)],
         sqlDate(new Date(a.start.getTime() + 86400000))]);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }

  /* ---- refresh provider rating aggregates ---- */
  await conn.execute(
    `UPDATE provider_profiles p SET
       rating_avg = COALESCE((SELECT ROUND(AVG(rating),2) FROM reviews r WHERE r.provider_id = p.id), 0),
       review_count = (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id)`);

  /* ---------------- Notifications ---------------- */
  const notifDefs = [
    [2, 'Welcome to Appointify', 'Your account is ready. Book your first appointment today.', 'success', '/services'],
    [2, 'Profile completed', 'Add a photo so professionals recognise you.', 'info', '/dashboard/profile'],
    [1, 'Provider approved', 'Your provider profile has been approved.', 'success', '/provider']
  ];
  for (const [uid, t, m, ty, link] of notifDefs) {
    await conn.execute(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)', [uid, t, m, ty, link]);
  }

  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM users) users,
            (SELECT COUNT(*) FROM services) services,
            (SELECT COUNT(*) FROM appointments) appointments,
            (SELECT COUNT(*) FROM payments) payments,
            (SELECT COUNT(*) FROM reviews) reviews`);

  console.log('Seed complete:', counts);
  console.log('\n  DEMO ACCOUNTS  (password for all: Password123!)');
  console.log('  ─────────────────────────────────────────────');
  console.log('  Admin     admin@appointify.com');
  console.log('  Customer  sofia@example.com   (also: marcus@, elena@, david@, priya@, james@)');
  console.log('  Provider  isabelle@appointify.com (also: marcus.d@, naomi@, omar@, camille@, lucas@)');
  console.log('  Pending   aisha@appointify.com, theo@appointify.com\n');

  await conn.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
