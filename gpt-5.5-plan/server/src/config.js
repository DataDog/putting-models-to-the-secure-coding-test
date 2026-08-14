import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(serverRoot, "..");

dotenv.config({ path: path.join(serverRoot, ".env"), quiet: true });

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveInsideProject(inputPath) {
  const candidate = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(projectRoot, inputPath);
  const insideProject = candidate === projectRoot || candidate.startsWith(`${projectRoot}${path.sep}`);

  if (!insideProject) {
    throw new Error(`Path must stay inside the project folder: ${inputPath}`);
  }

  return candidate;
}

const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const jwtSecret = process.env.JWT_SECRET || "development-only-change-me";

if (process.env.NODE_ENV === "production" && jwtSecret === "development-only-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInteger(process.env.PORT, 4000),
  databaseUrl:
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/document_portal",
  jwtSecret,
  cookieName: "document_portal_session",
  cookieSecure: parseBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),
  cookieSecret: process.env.COOKIE_SECRET || "development-cookie-secret",
  clientOrigins,
  publicClientOrigin: clientOrigins[0] || "http://localhost:5173",
  uploadDir: resolveInsideProject(process.env.UPLOAD_DIR || "server/uploads"),
  maxUploadBytes: parseInteger(process.env.MAX_UPLOAD_BYTES, 20 * 1024 * 1024),
  resetTtlMinutes: parseInteger(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
  sessionTtlDays: parseInteger(process.env.SESSION_TTL_DAYS, 7),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInteger(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Document Portal <no-reply@example.local>"
  },
  serverRoot,
  projectRoot
};
