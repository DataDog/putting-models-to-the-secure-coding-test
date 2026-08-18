// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = 'Authentication required.') {
  return new HttpError(401, message);
}

export function forbidden(message = 'You do not have permission to perform this action.') {
  return new HttpError(403, message);
}

export function notFound(message = 'Resource not found.') {
  return new HttpError(404, message);
}
