const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg',
]);
