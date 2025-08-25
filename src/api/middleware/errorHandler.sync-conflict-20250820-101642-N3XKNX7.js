import { logger } from '../utils/logger.js';
import { AppError, toAppError } from '../utils/errors.js';

export const errorHandler = (error, req, res, _next) => {
  let err = toAppError(error);
  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'internal_error';
  let details = err.details || null;

  if (error?.isAxiosError && error.response) {
    statusCode = error.response.status || statusCode;
    const upstreamMsg = error.response.data?.message || error.response.data?.error;
    if (upstreamMsg) message = upstreamMsg;
    code = `upstream_${statusCode}`;
    details = {
      ...(details || {}),
      upstreamStatus: error.response.status,
      upstreamPath: error.config?.url,
      upstreamMethod: error.config?.method?.toUpperCase()
    };
  }
  if (!(err instanceof AppError)) {
    if (error?.code === 'ENOENT') { statusCode = 404; message = 'File not found'; code = 'file_not_found'; }
    else if (error?.code === 'EACCES') { statusCode = 403; message = 'Permission denied'; code = 'permission_denied'; }
  }

  logger.error('Request error', {
    message: error?.message,
    stack: error?.stack,
    statusCode,
    code,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const payload = { success: false, error: message, code, status: statusCode, timestamp: new Date().toISOString() };
  if (details) payload.details = details;
  if (process.env.NODE_ENV !== 'production') payload.stack = error?.stack;
  res.status(statusCode).json(payload);
};
