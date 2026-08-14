import { ZodError } from "zod";
import multer from "multer";
import { config } from "./config.js";
import { verifySessionJwt } from "./auth.js";
import { httpError } from "./http.js";
import { query } from "./db.js";

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[config.cookieName];

    if (!token) {
      throw httpError(401, "Authentication required.");
    }

    const payload = verifySessionJwt(token);
    const { rows } = await query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_disabled,
        s.jwt_id,
        s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.jwt_id = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.is_disabled = false
      LIMIT 1`,
      [payload.jti]
    );

    const user = rows[0];
    if (!user || user.id !== payload.sub) {
      throw httpError(401, "Authentication required.");
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isDisabled: user.is_disabled
    };
    req.session = {
      jwtId: user.jwt_id,
      expiresAt: user.expires_at
    };

    next();
  } catch (error) {
    next(httpError(401, "Authentication required."));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(httpError(403, "Insufficient permissions."));
      return;
    }

    next();
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }

  const status = error.status || 500;
  const message = status >= 500 ? "Unexpected server error." : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
}
