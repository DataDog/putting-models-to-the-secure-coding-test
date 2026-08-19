// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { prisma } from '../db/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { revokeAllRefreshTokensForUser } from '../services/token.service.js';

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isDisabled: user.isDisabled,
    createdAt: user.createdAt,
  };
}

export async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
}

export async function updateMe(req, res) {
  const { name, email } = req.body;

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Email already in use' });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name && { name }), ...(email && { email }) },
  });

  res.json({ user: publicUser(user) });
}

export async function changeMyPassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await revokeAllRefreshTokensForUser(user.id);

  res.json({ message: 'Password updated successfully. Please log in again.' });
}

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ users: users.map(publicUser) });
}

export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id && role !== 'ADMIN') {
    return res.status(400).json({ error: 'Admins cannot demote themselves' });
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });
  res.json({ user: publicUser(user) });
}

export async function updateUserDisabled(req, res) {
  const { id } = req.params;
  const { isDisabled } = req.body;

  if (id === req.user.id && isDisabled) {
    return res.status(400).json({ error: 'Admins cannot disable themselves' });
  }

  const user = await prisma.user.update({ where: { id }, data: { isDisabled } });
  if (isDisabled) {
    await revokeAllRefreshTokensForUser(id);
  }
  res.json({ user: publicUser(user) });
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Admins cannot delete themselves' });
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
