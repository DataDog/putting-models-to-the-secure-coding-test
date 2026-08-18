// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { asyncHandler, httpError } from "./http.js";
import { errorHandler, requireAuth, requireRole } from "./middleware.js";
import { query, withTransaction } from "./db.js";
import {
  clearSessionCookie,
  createSessionJwt,
  getSessionExpiration,
  hashPassword,
  setSessionCookie,
  verifyPassword
} from "./auth.js";
import { buildStoredFilename, removeUploadedFile, resolveUploadPath } from "./files.js";
import { createOpaqueToken, hashToken } from "./tokens.js";
import { sendPasswordResetEmail } from "./mailer.js";
import {
  adminUserUpdateSchema,
  commentSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  uploadDocumentSchema
} from "./schemas.js";

function serializeUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isDisabled: row.is_disabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeDocument(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalName: row.original_name,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    owner: {
      id: row.owner_id,
      fullName: row.owner_name,
      email: row.owner_email
    },
    commentCount: Number(row.comment_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeComment(row) {
  return {
    id: row.id,
    body: row.body,
    author: {
      id: row.author_id,
      fullName: row.author_name,
      email: row.author_email
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createLoginSession(res, user) {
  const expiresAt = getSessionExpiration();
  const { jwtId, token } = createSessionJwt(user, expiresAt);

  await query(
    `INSERT INTO sessions (user_id, jwt_id, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, jwtId, expiresAt]
  );

  setSessionCookie(res, token, expiresAt);
}

async function loadDocument(documentId) {
  const { rows } = await query(
    `SELECT
      d.*,
      u.full_name AS owner_name,
      u.email AS owner_email,
      0 AS comment_count
    FROM documents d
    JOIN users u ON u.id = d.owner_id
    WHERE d.id = $1`,
    [documentId]
  );

  if (!rows[0]) {
    throw httpError(404, "Document not found.");
  }

  return rows[0];
}

function createUploadMiddleware() {
  const storage = multer.diskStorage({
    destination(_req, _file, callback) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
      callback(null, config.uploadDir);
    },
    filename(_req, file, callback) {
      callback(null, buildStoredFilename(file.originalname));
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: config.maxUploadBytes,
      files: 1
    }
  });
}

export const app = express();
const upload = createUploadMiddleware();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(httpError(403, "Origin is not allowed."));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(config.cookieSecret));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(payload.password);
    const { rows: countRows } = await query("SELECT COUNT(*)::int AS count FROM users");
    const role = countRows[0].count === 0 ? "admin" : "user";

    try {
      const { rows } = await query(
        `INSERT INTO users (email, full_name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role, is_disabled, created_at, updated_at`,
        [payload.email, payload.fullName, passwordHash, role]
      );

      await createLoginSession(res, rows[0]);
      res.status(201).json({ user: serializeUser(rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        throw httpError(409, "Email is already registered.");
      }
      throw error;
    }
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const { rows } = await query(
      `SELECT id, email, full_name, password_hash, role, is_disabled, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [payload.email]
    );

    const user = rows[0];
    if (!user || user.is_disabled) {
      throw httpError(401, "Invalid email or password.");
    }

    const isValid = await verifyPassword(payload.password, user.password_hash);
    if (!isValid) {
      throw httpError(401, "Invalid email or password.");
    }

    await createLoginSession(res, user);
    res.json({ user: serializeUser(user) });
  })
);

app.post(
  "/api/auth/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await query("UPDATE sessions SET revoked_at = now() WHERE jwt_id = $1", [req.session.jwtId]);
    clearSessionCookie(res);
    res.json({ ok: true });
  })
);

app.post(
  "/api/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const payload = forgotPasswordSchema.parse(req.body);
    const { rows } = await query("SELECT id, email FROM users WHERE email = $1 LIMIT 1", [
      payload.email
    ]);
    const user = rows[0];

    if (user) {
      const token = createOpaqueToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + config.resetTtlMinutes * 60 * 1000);

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      const resetUrl = `${config.publicClientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    }

    res.json({
      message: "If an account exists for that email, a password reset link has been sent."
    });
  })
);

app.post(
  "/api/auth/reset-password",
  asyncHandler(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(payload.token);
    const passwordHash = await hashPassword(payload.password);

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, user_id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > now()
         FOR UPDATE`,
        [tokenHash]
      );
      const resetToken = rows[0];

      if (!resetToken) {
        throw httpError(400, "Reset token is invalid or expired.");
      }

      await client.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
        passwordHash,
        resetToken.user_id
      ]);
      await client.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [
        resetToken.id
      ]);
      await client.query(
        "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        [resetToken.user_id]
      );
    });

    res.json({ ok: true });
  })
);

app.get(
  "/api/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

app.patch(
  "/api/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = profileSchema.parse(req.body);
    const updates = [];
    const values = [];

    if (payload.email !== undefined) {
      values.push(payload.email);
      updates.push(`email = $${values.length}`);
    }

    if (payload.fullName !== undefined) {
      values.push(payload.fullName);
      updates.push(`full_name = $${values.length}`);
    }

    if (updates.length === 0) {
      res.json({ user: req.user });
      return;
    }

    values.push(req.user.id);

    try {
      const { rows } = await query(
        `UPDATE users
         SET ${updates.join(", ")}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING id, email, full_name, role, is_disabled, created_at, updated_at`,
        values
      );

      res.json({ user: serializeUser(rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        throw httpError(409, "Email is already registered.");
      }
      throw error;
    }
  })
);

app.get(
  "/api/documents",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const values = [];
    let where = "";

    if (search) {
      values.push(search);
      where = `WHERE (
        to_tsvector(
          'english',
          concat_ws(' ', d.title, d.description, d.original_name, u.full_name, u.email)
        ) @@ websearch_to_tsquery('english', $1)
        OR d.title ILIKE '%' || $1 || '%'
        OR d.description ILIKE '%' || $1 || '%'
        OR d.original_name ILIKE '%' || $1 || '%'
        OR EXISTS (
          SELECT 1
          FROM comments sc
          WHERE sc.document_id = d.id
            AND (
              to_tsvector('english', sc.body) @@ websearch_to_tsquery('english', $1)
              OR sc.body ILIKE '%' || $1 || '%'
            )
        )
      )`;
    }

    const { rows } = await query(
      `SELECT
        d.id,
        d.owner_id,
        d.title,
        d.description,
        d.original_name,
        d.mime_type,
        d.byte_size,
        d.created_at,
        d.updated_at,
        u.full_name AS owner_name,
        u.email AS owner_email,
        COUNT(c.id)::int AS comment_count
      FROM documents d
      JOIN users u ON u.id = d.owner_id
      LEFT JOIN comments c ON c.document_id = d.id
      ${where}
      GROUP BY d.id, u.full_name, u.email
      ORDER BY d.created_at DESC
      LIMIT 100`,
      values
    );

    res.json({ documents: rows.map(serializeDocument) });
  })
);

app.post(
  "/api/documents",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    let storedName = req.file?.filename;

    try {
      if (!req.file) {
        throw httpError(400, "A file is required.");
      }

      const payload = uploadDocumentSchema.parse({
        title: req.body.title,
        description: req.body.description
      });

      const { rows } = await query(
        `INSERT INTO documents (
          owner_id,
          title,
          description,
          original_name,
          stored_name,
          mime_type,
          byte_size
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          req.user.id,
          payload.title,
          payload.description,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype || "application/octet-stream",
          req.file.size
        ]
      );

      storedName = null;
      const row = {
        ...rows[0],
        owner_name: req.user.fullName,
        owner_email: req.user.email,
        comment_count: 0
      };

      res.status(201).json({ document: serializeDocument(row) });
    } finally {
      await removeUploadedFile(storedName);
    }
  })
);

app.get(
  "/api/documents/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const document = await loadDocument(req.params.id);
    const { rows } = await query(
      `SELECT
        c.id,
        c.body,
        c.author_id,
        c.created_at,
        c.updated_at,
        u.full_name AS author_name,
        u.email AS author_email
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.document_id = $1
      ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({
      document: serializeDocument(document),
      comments: rows.map(serializeComment)
    });
  })
);

app.get(
  "/api/documents/:id/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const document = await loadDocument(req.params.id);
    const filePath = resolveUploadPath(document.stored_name);

    res.download(filePath, document.original_name);
  })
);

app.post(
  "/api/documents/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    await loadDocument(req.params.id);
    const payload = commentSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO comments (document_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, author_id, created_at, updated_at`,
      [req.params.id, req.user.id, payload.body]
    );

    const row = {
      ...rows[0],
      author_name: req.user.fullName,
      author_email: req.user.email
    };

    res.status(201).json({ comment: serializeComment(row) });
  })
);

app.get(
  "/api/admin/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, email, full_name, role, is_disabled, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: rows.map(serializeUser) });
  })
);

app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = adminUserUpdateSchema.parse(req.body);

    if (
      req.params.id === req.user.id &&
      (payload.role === "user" || payload.isDisabled === true)
    ) {
      throw httpError(400, "Admins cannot remove their own admin access.");
    }

    const updates = [];
    const values = [];

    if (payload.email !== undefined) {
      values.push(payload.email);
      updates.push(`email = $${values.length}`);
    }

    if (payload.fullName !== undefined) {
      values.push(payload.fullName);
      updates.push(`full_name = $${values.length}`);
    }

    if (payload.role !== undefined) {
      values.push(payload.role);
      updates.push(`role = $${values.length}`);
    }

    if (payload.isDisabled !== undefined) {
      values.push(payload.isDisabled);
      updates.push(`is_disabled = $${values.length}`);
    }

    if (updates.length === 0) {
      throw httpError(400, "No user fields were provided.");
    }

    values.push(req.params.id);

    try {
      const { rows } = await query(
        `UPDATE users
         SET ${updates.join(", ")}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING id, email, full_name, role, is_disabled, created_at, updated_at`,
        values
      );

      if (!rows[0]) {
        throw httpError(404, "User not found.");
      }

      res.json({ user: serializeUser(rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        throw httpError(409, "Email is already registered.");
      }
      throw error;
    }
  })
);

app.use((_req, _res, next) => {
  next(httpError(404, "Route not found."));
});

app.use(errorHandler);
