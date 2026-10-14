import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { hashPassword, verifyPassword, isPasswordAcceptable } from '../services/auth.service.js';
import { revokeAllSessionsForUser } from '../services/session.service.js';
import {
  findUserByEmail,
  findUserById,
  findUserByIdWithHash,
  updateUserProfile,
  updateUserPassword,
  listUsers,
  setUserRole,
  setUserActive,
  deleteUser,
} from '../services/user.service.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const setRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export async function getMyProfile(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) throw new AppError(404, 'User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const existing = await findUserByEmail(req.body.email);
    if (existing && existing.id !== req.user.id) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const user = await updateUserProfile(req.user.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changeMyPassword(req, res, next) {
  try {
    if (!isPasswordAcceptable(req.body.newPassword)) {
      throw new AppError(400, 'Password must be between 8 and 128 characters');
    }

    const user = await findUserByIdWithHash(req.user.id);
    const currentMatches = await verifyPassword(user.password_hash, req.body.currentPassword);
    if (!currentMatches) {
      throw new AppError(401, 'Current password is incorrect');
    }

    const passwordHash = await hashPassword(req.body.newPassword);
    await updateUserPassword(req.user.id, passwordHash);

    // Password change invalidates all sessions, including this one; the
    // client must log in again with the new password.
    await revokeAllSessionsForUser(req.user.id);
    clearAuthCookies(res);

    res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

export async function adminListUsers(req, res, next) {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function adminSetUserRole(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError(400, 'Admins cannot change their own role');
    }
    const user = await setUserRole(req.params.id, req.body.role);
    if (!user) throw new AppError(404, 'User not found');
    await revokeAllSessionsForUser(user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function adminSetUserActive(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError(400, 'Admins cannot deactivate their own account');
    }
    const user = await setUserActive(req.params.id, req.body.isActive);
    if (!user) throw new AppError(404, 'User not found');
    if (!req.body.isActive) {
      await revokeAllSessionsForUser(user.id);
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError(400, 'Admins cannot delete their own account');
    }
    await deleteUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
