import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredSecret(name, minLength) {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(`Environment variable ${name} must be at least ${minLength} characters`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: required('DATABASE_URL'),
  frontendOrigin: required('FRONTEND_ORIGIN'),
  jwtSecret: requiredSecret('JWT_SECRET', 32),
  cookieSigningSecret: requiredSecret('COOKIE_SIGNING_SECRET', 32),
};
