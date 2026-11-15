import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { AppError } from '../utilities/AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

for (const sub of ['avatars', 'services', 'misc']) {
  fs.mkdirSync(path.join(uploadRoot, sub), { recursive: true });
}

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = (req.query.folder || 'misc').toString();
    const safe = ['avatars', 'services', 'misc'].includes(folder) ? folder : 'misc';
    cb(null, path.join(uploadRoot, safe));
  },
  filename(_req, file, cb) {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 40);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base || 'image'}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED[file.mimetype]) {
      return cb(AppError.badRequest('Only JPEG, PNG, WebP, GIF or AVIF images are allowed'));
    }
    cb(null, true);
  }
});

export { uploadRoot };
