import { Router } from 'express';
import { authenticate, optionalAuth, authorize } from '../middleware/auth.js';
import { validate } from '../validators/schemas.js';
import {
  updateProfileSchema, changePasswordSchema, serviceSchema, categorySchema,
  availabilitySchema, blockDateSchema, createAppointmentSchema,
  appointmentStatusSchema, rescheduleSchema, reviewSchema,
  createPaymentSchema, confirmPaymentSchema, refundSchema,
  adminUserSchema, providerApprovalSchema
} from '../validators/schemas.js';

import {
  getProfile, updateProfile, changePassword
} from '../controllers/profile.controller.js';

import {
  listServices, getService, listCategories, myServices,
  createService, updateService, deleteService
} from '../controllers/service.controller.js';

import {
  getAvailability, quote, createAppointment, listAppointments,
  getAppointment, updateStatus, reschedule, cancelAppointment
} from '../controllers/appointment.controller.js';

import {
  createPayment, confirmPayment, listPayments, refundPayment, getReceipt
} from '../controllers/payment.controller.js';

import {
  createReview, providerReviews, myReviews, respondToReview
} from '../controllers/review.controller.js';

import {
  listNotifications, markRead, markAllRead, removeNotification, dashboardStats
} from '../controllers/notification.controller.js';

import {
  getMyAvailability, addAvailability, deleteAvailability, blockDate,
  unblockDate, previewSlots, providerAnalytics, providerCustomers,
  updateProviderProfile, providerOverview
} from '../controllers/provider.controller.js';

import * as admin from '../controllers/admin.controller.js';
import {
  listProviders, getProvider, testimonials, landingStats
} from '../controllers/public.controller.js';
import { contact, faq } from '../controllers/public-extra.controller.js';
import { upload } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';

const router = Router();

/* Spam guard for the public contact form (ISSUE-12) */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'too_many_requests', message: 'Too many messages from this device. Please try again later.' }
});

/* ===================== PUBLIC ===================== */
router.get('/services', optionalAuth, listServices);
router.get('/services/categories', listCategories);
/* /services/mine must precede /services/:id — otherwise "mine" is parsed as an id (ISSUE-2) */
router.get('/services/mine', authenticate, authorize('provider', 'admin'), myServices);
router.post('/services/mine', authenticate, authorize('provider', 'admin'), validate(serviceSchema), createService);
router.put('/services/mine/:id', authenticate, authorize('provider', 'admin'), validate(serviceSchema), updateService);
router.delete('/services/mine/:id', authenticate, authorize('provider', 'admin'), deleteService);
router.get('/services/:id', optionalAuth, getService);

router.get('/providers', listProviders);
router.get('/providers/:id', getProvider);
router.get('/providers/:id/availability', getAvailability);
router.get('/providers/:id/reviews', providerReviews);

router.get('/testimonials', testimonials);
router.get('/landing/stats', landingStats);
router.post('/contact', contact);
router.get('/faq', faq);
router.get('/appointments/quote', quote);

/* ===================== PROFILE (any authed user) ===================== */
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/profile/password', authenticate, validate(changePasswordSchema), changePassword);
router.get('/notifications', authenticate, listNotifications);
router.patch('/notifications/read-all', authenticate, markAllRead);
router.patch('/notifications/:id/read', authenticate, markRead);
router.delete('/notifications/:id', authenticate, removeNotification);
router.get('/dashboard/stats', authenticate, dashboardStats);

/* ---- uploads ---- */
router.post('/uploads', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url, filename: req.file.filename, size: req.file.size } });
});

/* ===================== CUSTOMER ===================== */
router.post('/appointments', authenticate, validate(createAppointmentSchema), createAppointment);
router.get('/appointments', authenticate, listAppointments);
router.get('/appointments/:id', authenticate, getAppointment);
router.delete('/appointments/:id', authenticate, cancelAppointment);
router.patch('/appointments/:id/reschedule', authenticate, validate(rescheduleSchema), reschedule);

router.post('/payments', authenticate, validate(createPaymentSchema), createPayment);
router.post('/payments/confirm', authenticate, validate(confirmPaymentSchema), confirmPayment);
router.get('/payments', authenticate, listPayments);
router.get('/payments/:id/receipt', authenticate, getReceipt);

router.post('/reviews', authenticate, validate(reviewSchema), createReview);
router.get('/reviews/mine', authenticate, myReviews);

/* ===================== PROVIDER ===================== */
router.get('/provider/overview', authenticate, authorize('provider', 'admin'), providerOverview);
router.get('/provider/availability', authenticate, authorize('provider', 'admin'), getMyAvailability);
router.post('/provider/availability', authenticate, authorize('provider', 'admin'), validate(availabilitySchema), addAvailability);
router.delete('/provider/availability/:id', authenticate, authorize('provider', 'admin'), deleteAvailability);
router.post('/provider/block-dates', authenticate, authorize('provider', 'admin'), validate(blockDateSchema), blockDate);
router.delete('/provider/block-dates/:id', authenticate, authorize('provider', 'admin'), unblockDate);
router.get('/provider/slots', authenticate, authorize('provider', 'admin'), previewSlots);
router.get('/provider/analytics', authenticate, authorize('provider', 'admin'), providerAnalytics);
router.get('/provider/customers', authenticate, authorize('provider', 'admin'), providerCustomers);
router.patch('/provider/profile', authenticate, authorize('provider', 'admin'), updateProviderProfile);

router.patch('/appointments/:id/status', authenticate, authorize('provider', 'admin'), validate(appointmentStatusSchema), updateStatus);
router.post('/reviews/:id/response', authenticate, authorize('provider', 'admin'), respondToReview);

/* ===================== ADMIN ===================== */
router.get('/admin/stats', authenticate, authorize('admin'), admin.adminReports);

router.get('/admin/users', authenticate, authorize('admin'), admin.listUsers);
router.post('/admin/users', authenticate, authorize('admin'), validate(adminUserSchema), admin.createUser);
router.put('/admin/users/:id', authenticate, authorize('admin'), admin.updateUser);
router.delete('/admin/users/:id', authenticate, authorize('admin'), admin.deleteUser);

router.get('/admin/providers', authenticate, authorize('admin'), admin.listProviders);
router.patch('/admin/providers/:id/approval', authenticate, authorize('admin'), validate(providerApprovalSchema), admin.approveProvider);
router.patch('/admin/providers/:id', authenticate, authorize('admin'), admin.updateProvider);

router.get('/admin/services', authenticate, authorize('admin'), admin.adminListServices);
router.post('/admin/services', authenticate, authorize('admin'), validate(serviceSchema), admin.adminCreateService);
router.put('/admin/services/:id', authenticate, authorize('admin'), validate(serviceSchema), admin.adminUpdateService);
router.delete('/admin/services/:id', authenticate, authorize('admin'), admin.adminDeleteService);

router.get('/admin/categories', authenticate, authorize('admin'), admin.listAllCategories);
router.post('/admin/categories', authenticate, authorize('admin'), validate(categorySchema), admin.createCategory);
router.put('/admin/categories/:id', authenticate, authorize('admin'), validate(categorySchema), admin.updateCategory);
router.delete('/admin/categories/:id', authenticate, authorize('admin'), admin.deleteCategory);

router.get('/admin/appointments', authenticate, authorize('admin'), admin.adminAppointments);
router.get('/admin/payments', authenticate, authorize('admin'), admin.adminPayments);
router.post('/admin/payments/:id/refund', authenticate, authorize('admin'), validate(refundSchema), refundPayment);
router.get('/admin/reports', authenticate, authorize('admin'), admin.adminReports);

export default router;
