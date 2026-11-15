# Appointify — Full QA Audit Report

> **Scope**: End-to-end functional, API/security, responsive, accessibility, performance and console/network audit of the Appointify stack (React 18 + Vite frontend, Express + MySQL backend), executed in real Chromium via Playwright with console/network inspection and screenshot evidence.
>
> **Environment**: Vite dev server `:5173`, Express API `:5000`, XAMPP MariaDB `appointify`, headless Chrome (Playwright `channel: 'chrome'`), 2026-11-13.
> **Evidence store**: `C:\Users\Administrator\AppData\Local\Temp\opencode\appointify-qa\` (`screenshots/`, `results-*.json`, audit scripts).

## Test coverage summary

| Phase | Area | Status |
|---|---|---|
| 1 | Route sweep — 50 records (public/customer/provider/admin × desktop/390/320/768) | ✅ DONE |
| 2 | Console errors / page errors / broken images / placeholder text / H1 audit | ✅ DONE |
| 3 | API + security audit (authz, SQLi, traversal, headers, CORS, validation, rate-limit) | ✅ DONE |
| 4 | Login form functional tests (empty submit, wrong password) | ✅ DONE |
| 5 | Provider login / pending-provider flows | ✅ DONE |
| 6 | Responsive overflow hunt + empirical fix validation (injected styles) | ✅ DONE |
| 7 | Customer E2E (contact, register, booking wizard, payments, cancel, profile, password, notifications, auth edges) | see §7 |
| 8 | Staff E2E (provider CRUD, availability, appointments, analytics, reviews; admin users/providers/services/appointments/payments/refunds/reports/CSV; role guards) | see §8 |
| 9 | Accessibility (headings, alt, labels, names, dup ids, focus rings, contrast, lang) | see §9 |
| 10 | Performance (production build, bundle, code-splitting, load times) | ✅ DONE |
| 11 | Edge matrix (double-submit, refresh persistence, back-nav, 404) | see §7/§8 |
| 12 | Issue report (this document) | ✅ DONE |
| 13 | Fixes + regression re-verification | pending |

---

## Issue register

Severity legend: **Critical** = feature broken for users / security hole · **High** = major flow broken or serious security weakness · **Medium** = noticeable defect, workaround exists · **Low** = cosmetic / dev-hygiene.

### ISSUE-1 — Booking wizard dead end via "Use next available" — **HIGH**

- **Location**: `frontend/src/pages/BookingPage.jsx` L216–244 (availability + slots effects), L577 (empty-state button), L316–328 (`createAppointment` dereferences `provider.id`).
- **Repro**: `/book` → pick a service with no linked professionals (e.g. first card) → Continue → step 2 shows "No professionals linked yet" → click **Use next available**.
- **Expected**: copy promises *"we'll match you with the next available specialist"* → calendar shows bookable dates → booking completes.
- **Actual**: step 3 renders, but `days=[]` because both effects early-return when `provider` is null → **0 of 30 dates enabled**, Continue permanently disabled, wizard stuck (no Back-to-recovery other than manual Back). `createAppointment` would additionally throw on `provider.id` if reached.
- **Evidence**: `screenshots/e2e-issue-next-available-deadend.png`; E2E record `ISSUE-1 … reachedStep3=true enabledDates=0/30 continueEnabled=false`.
- **Suggested fix**: when no provider selected, fetch platform-wide availability (new endpoint or `provider_id`-less variant), and auto-match a provider at quote/creation time — or remove the shortcut and block step 2 honestly.

### ISSUE-2 — Provider "My Services" page broken: `GET /api/services/mine` → 404 — **CRITICAL**

- **Location**: `backend/routes/index.js` — `router.get('/services/:id', …)` registered at L56 **before** `router.get('/services/mine', …)` at L113, so `:id` captures `"mine"`.
- **Repro**: login as provider (`isabelle@appointify.com`) → `/provider/services`.
- **Expected**: list of the provider's services.
- **Actual**: 2× console `404 GET /api/services/mine`, list broken (API returns `{"code":"not_found","message":"Service not found"}`). POST/PUT/DELETE on `/services/mine` unaffected (different HTTP methods) — only the GET list is broken.
- **Evidence**: `diagnose.js` output `[provider/services] 404 GET http://localhost:5173/api/services/mine` ×2; `audit-api.js` `GET /api/services/mine -> 404`.
- **Suggested fix**: register `/services/mine` (and any other static sub-routes) **before** `/services/:id`.
- **FIXED (Phase-13)**: the four `/services/mine` routes now precede `/services/:id` in `backend/routes/index.js`. Regression: `probe3-service.js` — `GET /api/services/mine → 200`, provider add-service dialog loads categories (was cascading-failing via `Promise.all`) and **`POST /api/services/mine → 201 "Service added to your catalogue"`**; `e2e-staff.js` P2–P11 (full service CRUD) all PASS.

### ISSUE-3 — 401 console errors for anonymous visitors on every public page — **MEDIUM**

- **Location**: `frontend/src/context/NotificationContext.jsx` L14–31 — polls `GET /api/notifications?limit=20` unconditionally on mount + every 45 s with no token guard.
- **Repro**: open any public page logged-out (`/`, `/services`, `/login`, …).
- **Expected**: no network errors in console for signed-out users.
- **Actual**: 2× `401 GET /api/notifications?limit=20` console errors per page load — **40 occurrences** across the 50-record route sweep.
- **Evidence**: `results-routes.json` (40× 401), drill output.
- **Suggested fix**: skip fetch (and polling) when `tokenStore.get()` is null; re-fetch on auth state change.
- **FIXED (Phase-13)**: `NotificationContext` now reads `useAuth().user` — clears items and skips fetch/polling while signed out. Regression: `e2e-approval.js` **B24 no stray 401 requests — PASS** across a signed-out → signed-in → signed-out journey.

### ISSUE-4 — CORS reflects any origin with credentials enabled — **HIGH (security)**

- **Location**: `backend/server.js` — origin callback `return cb(null, true)` for every origin.
- **Repro**: `curl -H "Origin: https://evil.example" http://localhost:5000/api/health`.
- **Expected**: only configured app origin(s) allowed.
- **Actual**: `Access-Control-Allow-Origin: https://evil.example` **and** `Access-Control-Allow-Credentials: true` — any website can make credentialed cross-origin API calls with the victim's JWT (if token is sent cross-site; combined with localStorage token storage this widens XSS/data-theft exposure).
- **Evidence**: `audit-api.js` → `CORS evil origin -> ACAO: https://evil.example | credentials: true`.
- **Suggested fix**: allowlist from `CLIENT_URL` / `CORS_ORIGINS` env; never reflect arbitrary origins with credentials.

### ISSUE-5 — Horizontal overflow on `/book` @390px and `/dashboard` @320px — **MEDIUM**

- **Location**:
  - `/book`: `BookingPage.jsx` `.grid.gap-7 lg:grid-cols-[1.6fr_1fr]` children missing `min-w-0`; the category `<select class="field !w-auto">` (min-content 318px) inflates the card → document 408px at 390 viewport (+18px).
  - `/dashboard`: `customer/OverviewPage.jsx` L87 `xl:grid-cols-[1.5fr_1fr]` grid children missing `min-w-0` → +40px at 320 viewport; appointment/recent-activity `li` rows render **342px wide at a 320px viewport** (right-hand badge/arrow cut at x=322, unscrollable).
- **Expected**: no horizontal scroll; rows fit the viewport.
- **Actual**: `scrollWidth 408/360 > innerWidth 390/320`; content clipped with no way to scroll to it.
- **Evidence**: `screenshots/evidence-320-recent-activity.png` (rows cut), `m320_dashboard.png`, `fixcheck-book-390.png`, `fixcheck-dash-recent-320.png`.
- **Validated fix (injected, not yet in source)**: `min-w-0` on the two grids' direct children → `scrollWidth == innerWidth` at both widths; appointments `li` additionally needs `basis-[140px]` on the text block + `ml-auto` on the date so titles don't collapse to 19px at 320.

### ISSUE-6 — Homepage documents +160px wider than viewport at every breakpoint — **LOW (cosmetic)**

- **Location**: Landing page decorative blur circles with `-right-40` / `-left-44` outside `overflow-hidden` sections.
- **Actual**: `documentElement.scrollWidth = innerW + 160` at 1440/768/390/320 — but `window.scrollTo(500,0)` → `scrollX = 0` (clipped by `body{overflow-x:hidden}`), so users cannot scroll; purely affects `scrollWidth`/mobile URL bar heuristics.
- **Evidence**: route sweep `/: +160px` at all viewports; `min-content.js` scroll test `scrolledTo: 0`.
- **Suggested fix**: `overflow-x-clip` on the affected sections (or the page wrapper).

### ISSUE-7 — Footer dead links `href="#"` — **LOW**

- **Location**: `frontend/src/components/ui/Footer.jsx` L124, L170–172.
- **Actual**: legal/social links jump to top instead of targets; inconsistent with real routes elsewhere.

### ISSUE-8 — React `forwardRef` warnings (framer `PopChild`) — **LOW**

- **Location**: `pages/ServicesPage.jsx:45` (`ServiceCard`), `pages/ProvidersPage.jsx:43` (`ProviderCard`) — function components rendered inside framer-motion `AnimatePresence > PopChild` receive a ref.
- **Actual**: 5× console warnings across the sweep; ref access fails (layout measurement may degrade).
- **Suggested fix**: wrap cards in `React.forwardRef`.

### ISSUE-9 — React Router v7 future-flag warnings — **LOW (dev hygiene)**

- 49× console warnings (`v7_startTransition`, `v7_relativeSplatPath`, …). No user impact; adopt flags or upgrade.

### ISSUE-10 — framer-motion "container must have non-static position" warnings — **LOW**

- 4× console warnings from `AnimatePresence` usage; layout animations may be subtly off. No functional break.

### ISSUE-11 — `GET /api/provider/overview` returns 403 for admin although route allows role `admin` — **LOW**

- **Location**: `backend/controllers/provider.controller.js` L198–200 — throws `Provider profile not found` (403) when the caller has no `provider_profiles` row; route is `authorize('provider','admin')`.
- **Actual**: admin token → 403 (verified `audit-api.js`). Admin UI doesn't call it today, so no visible breakage — but the API contract is inconsistent (admin allowed by route, rejected by controller).
- **Suggested fix**: return an empty/neutral overview for admins, or drop `'admin'` from the route.

### ISSUE-12 — Secrets/config hygiene — **MEDIUM (security hygiene)**

- `backend/.env` present with JWT secret + Stripe **test** keys; **no `.env.example`** anywhere in the repo (onboarding risk: nobody knows which vars to set).
- `backend/middleware/auth.js` L5: `process.env.JWT_SECRET || 'appointify_dev_secret'` — a hardcoded fallback secret; if `.env` is missing the API still runs with a publicly-known signing key (token forgery).
- `backend/routes/auth.routes.js`: rate limiter is in-memory (resets on restart — acceptable for dev, note for prod).
- `POST /api/contact` has **no rate limit** (only register/login are limited) — spam/abuse vector.
- **Suggested fix**: ship `.env.example`, fail fast (or generate a random secret) when `JWT_SECRET` unset, add a limiter to `/api/contact`.
- **FIXED (Phase-13)**: `backend/.env.example` shipped (documents every var incl. `PAYMENT_MODE`, SMTP, Stripe test keys); `middleware/auth.js` no longer uses the public constant — production **refuses to boot** without `JWT_SECRET`, dev auto-generates a machine-local `backend/.jwt-secret` (0600, survives restarts); `POST /api/contact` now rate-limited (10 / 15 min). In-memory auth limiter noted for prod.

### ISSUE-13 — First-load bundle includes Three.js on every route — **MEDIUM (performance)**

- **Location**: `frontend/src/App.jsx` L15 — `LandingPage` is the **only statically imported page** (all others `lazy`), so `three` (890.85 kB raw / 245 kB gzip) + R3F/drei sit in the entry graph and are **modulepreloaded on all routes** (visible in `dist/index.html`).
- **Actual first-load JS**: index 203.5 + vendor 224.1 + motion 193.8 + three 890.9 ≈ **1512 kB raw / ~444 kB gzip**, + 75 kB CSS. Route chunks are properly lazy (BookingPage 39.7 kB etc.); `ChartTheme`/recharts (401 kB) loads only on admin/provider pages (OK).
- **Evidence**: build output (`npm run build`), `dist/index.html` modulepreload lines.
- **Suggested fix**: `const LandingPage = lazy(...)` (Suspense already wraps routes), and/or lazy the `SuccessCheck` 3D canvas inside BookingPage step 7.

### ISSUE-14 — SPA unknown routes return HTTP 200 — **LOW**

- `/nonexistent-page` returns `200` with client-rendered 404 UI (route sweep). Fine for an SPA demo; for SEO/semantics serve 404 status via server fallback rule.

### ISSUE-15 — Rapid double-click on Review "Continue" creates the booking but bounces the user back to step 3 — **MEDIUM**

- **Location**: `frontend/src/pages/BookingPage.jsx` L316–340 (`createAppointment`) — `busy` state is React-async, so two clicks dispatched in the same tick both fire; the loser's `409` catch runs `setTimeout(() => go(3), 1400)` unconditionally.
- **Repro**: `/book` → reach step 5 (Review) → dispatch `btn.click(); btn.click();` synchronously.
- **Expected**: one POST; user lands on Payment step.
- **Actual**: `201 POST /api/appointments` **+** `409 POST /api/appointments`; UI reaches Payment at t≈2 s, then the 409 handler **resets the wizard to step 3 (Date & time) at t≈3.4 s even though the booking succeeded** — user loses the confirmed booking view (payment never completed for it; `slot` cleared). Server-side double-booking protection itself works (exactly 1 appointment created).
- **Evidence**: `probe-doubleclick.js` output — `clicked x2; disabledAfterFirst=false`, `201 POST /api/appointments` → `409 POST … conflict`, heading timeline `Payment → Choose a date & time`.
- **Suggested fix**: synchronous re-entrancy guard (`busyRef.current` check before the request) so only one POST fires; and in the 409 handler only redirect when no appointment has been created in this session.

### ISSUE-16 — Customer profile save completely broken (422 by default, 500 with valid payload) — **HIGH**

- **Location**:
  1. `backend/validators/schemas.js` L56 — `gender: z.enum([...]).optional()` rejects `''`, but `frontend/src/pages/customer/ProfilePage.jsx` L292 renders *"Prefer not to say"* as `<option value="">` and the form always submits `gender` (default `''` for users with no stored gender) → **422** `Invalid enum value … received ''` on every default save.
  2. `backend/controllers/profile.controller.js` L49–57 — the customer_profiles upsert reuses `?` placeholders in `ON DUPLICATE KEY UPDATE` but pushes the values only **once**: SQL expects `1 + N + N` params (`INSERT` = user_id + N fields, `UPDATE` = N fields) while only `N + 1` are supplied → **500 `ER_MALFORMED_PACKET`** ("Malformed communication packet"). The preceding `users` UPDATE has already committed (e.g. phone persists) but the response is a 500 and customer-profile fields are never written.
- **Repro**: login as customer → `/dashboard/profile` → **Save changes** (defaults) → 422 "Please check the highlighted fields"; then set Gender to any valid option → Save → 500 in console/network.
- **Expected**: profile saves succeed; empty gender stored as NULL.
- **Actual**: no combination of the default form state saves; UI shows a validation error for data that was never invalid (422), or a generic failure (500).
- **Evidence**: `probe-cancel-profile.js` — request body `{name, phone, avatar_url, gender:"", address:"", city:"", country:"", notes}` → `422 PUT /api/profile`; with `gender=prefer_not_to_say` → `500 PUT /api/profile` `ER_MALFORMED_PACKET`, phone persisted after reload; E2E run #7 `G1/G2 FAIL` + console `422 ×2`.
- **Suggested fix**: allow `''` for `gender` in the schema (controller already maps `'' → null` via `v || null`), and build the upsert with values supplied for both the `INSERT` and the `ON DUPLICATE KEY UPDATE` clauses (or use `col = VALUES(col)`).

### ISSUE-17 — New bookings bypassed provider approval (paid = instantly confirmed) — **HIGH**

- **Location**: `backend/controllers/appointment.controller.js` (`createAppointment`, `updateStatus`), `backend/controllers/payment.controller.js` (`confirmPayment`), provider `AppointmentsPage`/`OverviewPage`, `BookingPage` step 7.
- **Reported by**: end user — *"when a customer books an appointment it shall go to the specialist's approval list like they shall accept / reject that booking, not directly to their appointments list."*
- **Expected**: every new booking (paid or not) waits in a provider approval queue; the professional accepts (`pending → confirmed`) or declines (`pending → rejected`, auto-refund if paid); approved bookings then appear in Appointments.
- **Actual (before fix)**: `POST /api/appointments` created `pending`, but `confirmPayment` immediately ran `UPDATE appointments SET status='confirmed'` — paying (or the provider's default list view) dropped the request straight into the Appointments list with no accept/decline step. Reschedule also force-`confirmed` a pending booking.
- **Fix implemented**:
  - Payment no longer confirms the appointment; response copy is *"Payment received — your request is awaiting the professional's approval"*; receipt email only (confirmation email is sent by `updateStatus` on approval).
  - `GET /api/appointments` accepts `exclude=` and, **for the provider role, defaults to `exclude=pending`** unless an explicit `status` filter is given — unapproved requests can never leak into the provider's Appointments list.
  - New provider page **`/provider/requests`** ("Booking requests") — search, detail drawer, inline **Accept** / **Decline** (decline dialog with optional reason sent to the customer; auto-refund noted when paid).
  - Sidebar nav item **Booking requests** with a live gold count badge; gold banner on `/provider/appointments` ("N booking requests waiting for your approval" → Review requests); provider Overview "Booking requests" panel now opens the queue.
  - Reschedule keeps `pending` pending (`CASE WHEN status='pending' THEN 'pending' ELSE 'confirmed' END`).
  - Customer-facing copy: tab/badge **"Awaiting approval"**, booking success = "Request received / Paid · Awaiting approval", marketing copy ("Instant confirmation" → approval-based) updated in About/CallToAction/StorySections/Service & Provider detail.
- **Evidence (regression)**: `e2e-approval.js` — **24/24** expected: booking stays `pending` after payment (B4), provider list hides it (B6/B9), queue shows it with Accept/Decline (B8/B11/B12), sidebar badge (B13), accept → `confirmed` in both lists for provider and customer (B15–B17), decline via UI dialog → customer sees `rejected` + reason (B19/B20), customer tab "Awaiting approval" (B21), zero console errors / zero stray 401s (B23/B24).
- **Side effects**: `NotificationContext` now skips polling while signed out (stray `GET /api/notifications → 401` on public pages — was ISSUE-3's console noise, now fixed).

### ISSUE-18 — 54 invalid Tailwind opacity modifiers → invisible / wrong-colored text — **HIGH (visual)**

- **Location**: across `frontend/src` (54 occurrences), notably `components/landing/Hero.jsx` (`text-ivory/78` — the paragraph under *"Your Time. Your Schedule."*) and `components/dashboard/DashboardShell.jsx` (`text-ivory/68` — sidebar nav labels).
- **Reported by**: end user — *"the 2 lines under 'Your Time. Your Schedule.' are not visible"* and *"portal sidebar list items are not visible"*.
- **Root cause**: Tailwind v3.4 generates opacity utilities only in **steps of 5**; `/68`, `/78`, `/54`… are not in the scale, so the class silently does nothing — text rendered at full-opacity burgundy-on-burgundy or as the inherited near-invisible color.
- **Fix**: all 54 occurrences rounded to valid steps (e.g. `/78 → /80`, `/68 → /70`, `/54 → /55`); automated re-scan reports **0** remaining invalid modifiers.
- **Evidence**: `probe5-verify.js` — hero paragraph computed color `rgba(255,249,240,0.8)`; sidebar nav label `rgba(255,249,240,0.7)` on all three portals (customer/provider/admin); a forced-red screenshot test proved full-page screenshots show stale WebGL layers, so DOM measurements are authoritative.

### ISSUE-19 — Hero / CTA buttons: wrong placement, wrong navigation targets — **MEDIUM**

- **Location**: `frontend/src/components/landing/Hero.jsx`, `frontend/src/components/landing/CallToAction.jsx`, `startBooking()` in `ServiceDetailPage.jsx` / `ProviderDetailPage.jsx`.
- **Reported by**: end user — *"home 'Explore Services' button placement/size is wrong"*; *"'check availability and book appointment' buttons navigate to the service page again — not correct."*
- **Actual (before fix)**: Explore Services was undersized/misaligned vs. its sibling; several marketing CTAs routed back to `/services` (or re-opened the same detail page) instead of the booking wizard; CallToAction's primary had no `btn` styling.
- **Fix**: Explore Services → `btn btn-lg whitespace-nowrap` (h58, aligned with the h56 primary at the same y-baseline); Hero primary → `/book`, Explore → `/services`; CallToAction "Book an Appointment" → `/book` + `btn`, "Create free account" + `btn`; `startBooking()` always targets `/book?…` (guests are sent to `/login` with `from` preserved).
- **Evidence**: `probe5-verify.js` — both hero buttons measured (`h58/y609` vs `h56/y610`, no wrap); href/onclick assertions for Hero + CallToAction + both detail pages.

### ISSUE-20 — Contact page form card occupied extra vertical space — **LOW (cosmetic)**

- **Location**: `frontend/src/pages/ContactPage.jsx` (form card column).
- **Reported by**: end user — *"contact form box occupies extra space downwards."*
- **Actual (before fix)**: the card stretched to the grid row height, leaving ~290 px of empty space under the form.
- **Fix**: card uses `self-start`; **Evidence**: `probe5-verify.js` — gap under the card reduced **290 px → 33 px**.

### ISSUE-21 — Portal sidebar nav labels not visible — **MEDIUM**

- **Location**: `frontend/src/components/dashboard/DashboardShell.jsx` (`text-ivory/68` on nav labels — see ISSUE-18) + nav item contrast on the burgundy rail.
- **Reported by**: end user — *"portal sidebar list items are not visible."*
- **Fix**: opacity corrected to `/70` (valid step); verified on customer, provider and admin portals.
- **Evidence**: computed color `rgba(255,249,240,0.7)` for every sidebar `<a>` on `/dashboard`, `/provider`, `/admin` (probe5-verify.js); sidebar screenshots in `screenshots/`.

### ISSUE-22 — Signed-out visitors polled `/api/notifications` every 45 s → permanent 401s — **LOW**

- **Location**: `frontend/src/context/NotificationContext.jsx`.
- **Actual (before fix)**: `NotificationProvider` mounted for anonymous users and polled with no token → console/network 401 on every public page (the remaining noise behind ISSUE-3).
- **Fix**: poll only while `useAuth().user` is set; clear items/unread on sign-out.
- **Evidence**: `e2e-approval.js` B24 — zero 401 responses across a full signed-in + signed-out journey.

### ISSUE-23 — Provider "Add service" always failed with 500 (`ERR_INVALID_ARG_TYPE`) — **HIGH**

- **Location**: `backend/controllers/service.controller.js` L171 (`createService`).
- **Root cause**: `uniqueSlug()` is declared `async` (L239) but called **without `await`** — a `Promise` was passed to mysql2 as the `slug` parameter → `The first argument must be of type string … Received an instance of Promise` → **500**. Discovered only after ISSUE-2's route fix made `POST /api/services/mine` reachable (the 404 had been masking it).
- **Repro**: provider → `/provider/services` → Add service → fill form → submit.
- **Expected**: 201, row appears, dialog closes.
- **Actual**: 500, toast shows the raw driver error, dialog stays open (before fix).
- **Evidence**: `probe3-service.js` — before: `NET 500 POST /api/services/mine :: {"code":"ERR_INVALID_ARG_TYPE"…}`; after: `NET 201 … "Service created"`, `dialogOpen: false`, toast *"Service added to your catalogue"*.
- **Fix**: `await uniqueSlug(b.name)`.

### ISSUE-24 — Admin payments totals 500 (`Unknown column 'pay.status'`) whenever a status/search filter is applied — **MEDIUM**

- **Location**: `backend/controllers/admin.controller.js` L403–409 (`adminPayments` totals query).
- **Root cause**: the totals SQL was `FROM payments ${whereSql}` but the `WHERE` clauses are built with the **`pay.` table alias** (`pay.status = ?`, `pay.transaction_ref LIKE ?`) and reference joined tables `a.`/`u.` — without `FROM payments pay … JOIN …` the query throws `ER_BAD_FIELD_ERROR`.
- **Repro**: `/admin/payments` → click any status tab (Pending/Refunded/…) or type in search → totals request 500 (unfiltered view worked, so the page's headline numbers silently went stale/zero on every filter).
- **Evidence**: backend log `ER_BAD_FIELD_ERROR Unknown column 'pay.status' in 'WHERE'`; after fix `probe-totals.js` → all four filter combinations `200` with correct `totals.count` (158 unfiltered / 7 for `search=QA` / 0 for no-match).
- **Fix**: totals query now selects from `payments pay JOIN appointments a … JOIN users u …` with aliased columns, reusing the same `whereSql` as the row query.

---

## NOT TESTED (requires external credentials/services)

| Item | Reason |
|---|---|
| Real SMTP email delivery (confirmations, contact form, admin alerts) | `SMTP_*` blank → emails logged to console only; no real mailbox available |
| Real Stripe payment processing (charges/webhooks/refunds) | `PAYMENT_MODE=mock` with test keys; mock intent/confirm path tested instead |
| Google Fonts availability offline | external `fonts.googleapis.com` dependency |
| Multi-browser (Firefox/WebKit) & real touch devices | Chromium only (system Chrome) |
| Production `NODE_ENV=production` error envelopes | dev mode exercised |

---

*(§7 Customer E2E, §8 Staff E2E, §9 Accessibility, §10 Performance details and §13 fix/regression results are appended after test runs complete.)*
