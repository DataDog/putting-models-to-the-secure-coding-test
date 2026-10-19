export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function badRequest(message = 'Invalid request') {
  return new HttpError(400, message);
}

export function forbidden(message = 'Forbidden') {
  return new HttpError(403, message);
}

export function unauthorized(message = 'Authentication required') {
  return new HttpError(401, message);
}

export function notFound(message = 'Not found') {
  return new HttpError(404, message);
}

