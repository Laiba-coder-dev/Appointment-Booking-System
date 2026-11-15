import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../validators/schemas.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { register, login, me, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'too_many_requests', message: 'Too many attempts. Please try again in 15 minutes.' }
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

export default router;
