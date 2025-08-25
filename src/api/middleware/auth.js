import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export const authMiddleware = (req, res, next) => {
  try {
    // Internal service token (e.g., Discord bot) bypass using shared secret
    const serviceToken = req.headers['x-service-token'];
    if (serviceToken && process.env.SERVICE_BOT_TOKEN && serviceToken === process.env.SERVICE_BOT_TOKEN) {
      req.user = { id: 'service-bot', username: 'service-bot', roles: ['service'] };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    
    logger.info(`Authenticated user: ${decoded.username}`, {
      userId: decoded.id,
      route: req.originalUrl
    });
    
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      route: req.originalUrl,
      ip: req.ip
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed.' 
    });
  }
};
