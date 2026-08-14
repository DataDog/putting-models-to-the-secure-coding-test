import { config } from '../config.js';

// The reference deployment (client/js on GitHub Pages, API on its own host)
// puts frontend and backend on different sites, so a cross-site fetch would
// never carry a SameSite=Strict/Lax cookie at all. SameSite=None (which
// requires Secure) is the only setting that works there; in local dev,
// frontend and backend both run on localhost, which is same-site regardless
// of port, so Lax is fine and doesn't need HTTPS. Cross-site cookies lose
// SameSite's built-in CSRF protection, which is exactly why requireCsrf
// (double-submit token) exists as an explicit, separate defense.
const baseCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'none' : 'lax',
  path: '/',
};

export function setAccessTokenCookie(res, token) {
  res.cookie('access_token', token, {
    ...baseCookieOptions,
    maxAge: config.accessTokenTtlMinutes * 60 * 1000,
  });
}

export function setRefreshTokenCookie(res, token) {
  res.cookie('refresh_token', token, {
    ...baseCookieOptions,
    path: '/api/auth', // only sent to auth endpoints (refresh/logout)
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...baseCookieOptions });
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/api/auth' });
}
