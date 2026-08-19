// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateRoleSchema,
  updateDisableSchema,
  userIdParamSchema,
} from '../validators/users.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/me', usersController.getMe);
router.patch('/me', validate(updateProfileSchema), usersController.updateMe);
router.patch('/me/password', validate(changePasswordSchema), usersController.changeMyPassword);

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireRole('ADMIN'));
adminUsersRouter.get('/', usersController.listUsers);
adminUsersRouter.patch('/:id/role', validate(updateRoleSchema), usersController.updateUserRole);
adminUsersRouter.patch('/:id/disable', validate(updateDisableSchema), usersController.updateUserDisabled);
adminUsersRouter.delete('/:id', validate(userIdParamSchema), usersController.deleteUser);

export default router;
