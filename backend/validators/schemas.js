/**
 * Zod validators — request body/query validation with friendly messages.
 */
import { z } from 'zod';
import { AppError } from '../utilities/AppError.js';

export function validate(schema, data = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[data]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || data,
        message: i.message
      }));
      return next(AppError.validation('Please check the highlighted fields', details));
    }
    req.validated = req.validated || {};
    req.validated[data] = result.data;
    // merge parsed (coerced) values back onto the request
    if (data === 'body') req.body = result.data;
    if (data === 'query') req.query = { ...req.query, ...result.data };
    next();
  };
}

/* --------------------------- Auth --------------------------- */
export const registerSchema = z.object({
  name: z.string().min(2, 'Please enter your full name').max(120),
  email: z.string().email('Enter a valid email address').max(190),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  role: z.enum(['customer', 'provider']).default('provider').or(z.enum(['customer', 'provider'])),
  phone: z.string().max(30).optional().or(z.literal('')),
  // provider-only optional fields
  specialization: z.string().max(150).optional().or(z.literal('')),
  headline: z.string().max(180).optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  experience_years: z.coerce.number().int().min(0).max(60).optional(),
  location: z.string().max(190).optional().or(z.literal(''))
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

/* --------------------------- Profile --------------------------- */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).optional().or(z.literal('')),
  avatar_url: z.string().max(500).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional(),
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal(''))
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number')
});

/* --------------------------- Services --------------------------- */
export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name is required').max(160),
  category_id: z.coerce.number().int().positive('Choose a category'),
  description: z.string().max(2000).optional().or(z.literal('')),
  duration_min: z.coerce.number().int().min(5, 'Minimum 5 minutes').max(600, 'Maximum 600 minutes'),
  price: z.coerce.number().min(0).max(99999),
  image_url: z.string().max(500).optional().or(z.literal('')),
  is_active: z.coerce.number().int().min(0).max(1).optional()
});

export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  image_url: z.string().max(500).optional().or(z.literal('')),
  sort_order: z.coerce.number().int().optional()
});

/* --------------------------- Availability --------------------------- */
export const availabilitySchema = z.object({
  day_of_week: z.coerce.number().int().min(0, '0 = Sunday').max(6, '6 = Saturday'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM'),
  slot_interval_min: z.coerce.number().int().min(10).max(480).default(60),
  is_active: z.coerce.number().int().min(0).max(1).default(1)
}).refine((d) => d.start_time < d.end_time, {
  message: 'End time must be after start time',
  path: ['end_time']
});

export const blockDateSchema = z.object({
  unavailable_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  reason: z.string().max(255).optional().or(z.literal(''))
});

/* --------------------------- Booking --------------------------- */
export const createAppointmentSchema = z.object({
  service_id: z.coerce.number().int().positive('Select a service'),
  provider_id: z.coerce.number().int().positive('Select a professional'),
  start_at: z.string().min(1, 'Select a date and time'),
  name: z.string().min(2, 'Your name is required').max(120),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(30).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal(''))
});

export const appointmentStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show']),
  status_reason: z.string().max(255).optional().or(z.literal(''))
});

export const rescheduleSchema = z.object({
  start_at: z.string().min(1, 'Select a new date and time')
});

/* --------------------------- Reviews --------------------------- */
export const reviewSchema = z.object({
  appointment_id: z.coerce.number().int().positive('Select an appointment'),
  rating: z.coerce.number().int().min(1, 'Choose 1–5 stars').max(5, 'Choose 1–5 stars'),
  comment: z.string().max(2000).optional().or(z.literal(''))
});

/* --------------------------- Payments --------------------------- */
export const createPaymentSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
  method: z.enum(['stripe', 'card', 'cash', 'wallet']).default('card')
});

export const confirmPaymentSchema = z.object({
  payment_id: z.coerce.number().int().positive(),
  transaction_ref: z.string().max(120).optional().or(z.literal('')),
  mode: z.enum(['mock', 'stripe']).default('mock')
});

export const refundSchema = z.object({
  amount: z.coerce.number().min(0).optional()
});

/* --------------------------- Users (admin) --------------------------- */
export const adminUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(['admin', 'provider', 'customer']),
  phone: z.string().max(30).optional().or(z.literal('')),
  is_active: z.coerce.number().int().min(0).max(1).default(1)
});

export const providerApprovalSchema = z.object({
  approval_status: z.enum(['approved', 'rejected'])
});
