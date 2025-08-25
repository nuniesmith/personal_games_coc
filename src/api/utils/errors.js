// Centralized application error classes for consistent error handling & logging.
// AppError carries an HTTP status code and optional error code for clients.

export class AppError extends Error {
  constructor(message, { status = 500, code = 'internal_error', details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true; // flag for distinguishing from programmer errors
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', opts = {}) { super(message, { status: 400, code: 'bad_request', ...opts }); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', opts = {}) { super(message, { status: 401, code: 'unauthorized', ...opts }); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', opts = {}) { super(message, { status: 403, code: 'forbidden', ...opts }); }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found', opts = {}) { super(message, { status: 404, code: 'not_found', ...opts }); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict', opts = {}) { super(message, { status: 409, code: 'conflict', ...opts }); }
}

export function toAppError(err) {
  if (!err) return new AppError('Unknown error');
  if (err instanceof AppError) return err;
  return new AppError(err.message || 'Internal error');
}
