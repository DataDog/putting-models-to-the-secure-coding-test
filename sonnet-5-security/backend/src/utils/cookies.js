import { env } from '../config/env.js';
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from '../services/token.service.js';

// __Host- prefixed cookies require Secure + Path=/ + no Domain attribute, and
// are rejected by browsers over plain HTTP, so they're only usable once the
// app is served over HTTPS. Local dev (typically http://localhost) falls
// back to plain cookie names with Secure disabled.
export const ACCESS_COOKIE_NAME = env.isProduction ? '__Host-access' : 'access';
export const REFRESH_COOKIE_NAME = env.isProduction ? '__Host-refresh' : 'refresh';
export const CSRF_COOKIE_NAME = env.isProduction ? '__Host-csrf' : 'csrf';

function baseOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(res, { accessToken, refreshToken, csrfToken }) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, baseOptions(ACCESS_TOKEN_TTL_MS));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, baseOptions(REFRESH_TOKEN_TTL_MS));
  // CSRF cookie must be readable by frontend JS to echo back as a header
  // (double-submit pattern), so httpOnly is intentionally false here.
  res.cookie(CSRF_COOKIE_NAME, csrfToken, { ...baseOptions(REFRESH_TOKEN_TTL_MS), httpOnly: false });
}

export function clearAuthCookies(res) {
  const opts = { path: '/', sameSite: 'strict', secure: env.isProduction };
  res.clearCookie(ACCESS_COOKIE_NAME, opts);
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
  res.clearCookie(CSRF_COOKIE_NAME, opts);
}
