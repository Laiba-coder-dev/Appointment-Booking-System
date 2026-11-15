# Appointify — Appointment Booking System

Appointify is a web application for discovering services and professionals, booking appointments, and managing those bookings. It includes separate customer, service provider, and admin experiences.

## Features

- Browse service categories, service details, and professional profiles.
- Create customer or service provider accounts and sign in.
- Book appointments using provider availability and booking slots.
- Let providers review incoming booking requests and accept or decline them.
- Manage customer profiles, appointments, notifications, reviews, and payment records.
- Provide provider tools for services, availability, appointments, customers, and analytics.
- Provide admin tools for users, providers, services, appointments, payments, and reports.
- Store account passwords as bcrypt hashes and use JWTs for authenticated API requests.

Provider accounts begin in a pending approval state. The application currently defaults to mock payment mode; configure and verify a real Stripe integration before accepting real payments.

## Technology

| Area | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, Tailwind CSS |
| Backend | Node.js (ES modules), Express 4 |
| Database | MySQL or MariaDB, accessed with `mysql2` and SQL queries |
| Authentication and validation | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), Zod |

The browser app sends `/api` requests to the Express API. During development, Vite proxies `/api` and `/uploads` to `http://localhost:5000`. The API reads and writes application data in MySQL/MariaDB. The schema is defined in `backend/database/schema.sql` and includes users, customer/provider profiles, services, availability, appointments, payments, reviews, and notifications.

## Requirements

- Node.js and npm
- MySQL or MariaDB (XAMPP MariaDB is one supported local option)

## Run locally

### 1. Configure the backend

In a terminal, install the backend dependencies and create its environment file:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` to match your local database. The template defaults to host `127.0.0.1`, port `3306`, and database `appointify`; set `DB_USER` and `DB_PASSWORD` for your MySQL/MariaDB installation. Keep `.env` private and out of version control.

### 2. Create the database schema

Make sure the database server is running, then, from the `backend` directory, run:

```powershell
npm run db:migrate
```

The migration creates the configured database if needed and applies the schema from `database/schema.sql`.

### 3. (Optional) Add development sample data

To populate a fresh, empty database with demo users, providers, services, and bookings, run this from `backend`:

```powershell
npm run db:seed
```

### 4. Start the API

In the `backend` directory:

```powershell
npm run dev
```

The API listens on port `5000` by default. Check its health endpoint at <http://localhost:5000/api/health>.

### 5. Start the frontend

Open a second terminal in the project and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually <http://localhost:5173>. If that port is already occupied, Vite may select another port. Set `CLIENT_URL` in `backend/.env` to the frontend's origin if you change it.

## Environment settings

`backend/.env.example` documents the backend settings:

- **Database:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Server and browser origin:** `PORT`, `CLIENT_URL`, `NODE_ENV`
- **Authentication:** `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Uploads:** `UPLOAD_DIR`, `MAX_UPLOAD_MB`
- **Email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- **Payments:** `PAYMENT_MODE` and Stripe keys

With SMTP settings left blank, email messages are logged instead of delivered to a real mailbox. The template sets `PAYMENT_MODE=mock` and contains Stripe test-key placeholders. Never use those placeholders or the seeded demo password for a production deployment.

If the frontend and API are hosted on different origins, set the frontend build variable `VITE_API_URL` to the API base URL and configure the backend for the deployed environment. In production, set `NODE_ENV=production` and provide a strong, unique `JWT_SECRET`; the backend refuses to start in production without it. Use a persistent production database and HTTPS, and configure payment and SMTP credentials for the intended environment.

## Useful commands

Run commands from the relevant directory:

| Directory | Command | Purpose |
|---|---|---|
| `backend` | `npm run dev` | Start the API with Node watch mode |
| `backend` | `npm start` | Start the API normally |
| `backend` | `npm run db:migrate` | Create the database and apply the schema |
| `backend` | `npm run db:seed` | Insert demo data into an empty database |
| `frontend` | `npm run dev` | Start the Vite development server |
| `frontend` | `npm run build` | Build the frontend for deployment |
| `frontend` | `npm run preview` | Preview the built frontend locally |

## Project structure

```text
backend/
  config/       MySQL connection pool
  controllers/  API request handlers
  database/    SQL schema, migration, and seed scripts
  middleware/   Authentication, validation/error handling, and uploads
  routes/       Express API routes
  services/     Email, payment, and availability services
frontend/
  src/          React app, pages, layouts, components, and API client
  vite.config.js
QA-REPORT.md    Existing QA audit and issue notes
```

