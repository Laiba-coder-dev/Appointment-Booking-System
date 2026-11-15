import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 5000;

/* ---------- Security & parsing ---------- */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        process.env.CLIENT_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173'
      ].filter(Boolean);
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(null, true); // allow all in development
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Static uploads ---------- */
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads'), {
  maxAge: '7d', immutable: true
}));

/* ---------- Health ---------- */
app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'appointify-api', status: 'ok', time: new Date().toISOString() });
});

/* ---------- Routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

/* ---------- Errors ---------- */
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  Appointify API  →  http://localhost:${PORT}/api/health\n`);
});

export default app;
