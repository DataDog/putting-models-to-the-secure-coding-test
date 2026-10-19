import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody } from '../middleware/validate.js';
import { loginRateLimiter, registerRateLimiter, forgotPasswordRateLimiter } from '../middleware/rateLimit.js';
import * as authController from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  registerRateLimiter,
  validateBody(authController.registerSchema),
  authController.register
);

authRouter.post('/login', loginRateLimiter, validateBody(authController.loginSchema), authController.login);

authRouter.post('/refresh', authController.refresh);

authRouter.post('/logout', requireAuth, requireCsrf, authController.logout);

authRouter.get('/me', requireAuth, authController.me);

authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validateBody(authController.forgotPasswordSchema),
  authController.forgotPassword
);

authRouter.post(
  '/reset-password',
  forgotPasswordRateLimiter,
  validateBody(authController.resetPasswordSchema),
  authController.resetPassword
);
