import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import * as userController from '../controllers/user.controller.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', userController.getMyProfile);

usersRouter.patch(
  '/me',
  requireCsrf,
  validateBody(userController.updateProfileSchema),
  userController.updateMyProfile
);

usersRouter.patch(
  '/me/password',
  requireCsrf,
  validateBody(userController.changePasswordSchema),
  userController.changeMyPassword
);

usersRouter.get('/', requireRole('admin'), userController.adminListUsers);

usersRouter.patch(
  '/:id/role',
  requireRole('admin'),
  requireCsrf,
  validateParams(userController.userIdParamSchema),
  validateBody(userController.setRoleSchema),
  userController.adminSetUserRole
);

usersRouter.patch(
  '/:id/active',
  requireRole('admin'),
  requireCsrf,
  validateParams(userController.userIdParamSchema),
  validateBody(userController.setActiveSchema),
  userController.adminSetUserActive
);

usersRouter.delete(
  '/:id',
  requireRole('admin'),
  requireCsrf,
  validateParams(userController.userIdParamSchema),
  userController.adminDeleteUser
);
