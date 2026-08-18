// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../services/auth.js';
import { isValidEmail, isValidPassword } from '../utils/validation.js';

const router = Router();

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { active, ...profile } = user;
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = {};

    if (name !== undefined) {
      data.name = name.trim() || null;
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      data.email = email.toLowerCase();
    }

    if (newPassword) {
      if (!isValidPassword(newPassword)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      data.passwordHash = await hashPassword(newPassword);
      data.refreshToken = null;
      data.refreshExpires = null;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });

    res.json({ user: updated, passwordChanged: !!newPassword });
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Valid email and password (min 8 chars) required' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name?.trim() || null,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authMiddleware, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role, active, name } = req.body;
    const data = {};

    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      data.role = role;
    }

    if (active !== undefined) {
      data.active = Boolean(active);
    }

    if (name !== undefined) {
      data.name = name.trim() || null;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    res.json({ user });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(err);
  }
});

export default router;
