import { AppError } from '../utils/AppError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, result.error.issues[0]?.message || 'Invalid request body'));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new AppError(400, result.error.issues[0]?.message || 'Invalid query parameters'));
    }
    req.query = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new AppError(400, result.error.issues[0]?.message || 'Invalid request parameters'));
    }
    req.params = result.data;
    next();
  };
}
