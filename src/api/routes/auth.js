import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Temporary in-memory user storage (replace with persistent store)
// Default seed users are only enabled in non-development unless ALLOW_DEFAULT_USERS=1
const seedUsers = [
  { id: 1, username: 'admin', password: '$2a$10$TEliRTMWGqqoLV0TyNFSIOi2QbYJi24Wttd3OcnkbZuA1SdsZRCl2', role: 'admin' }, // admin123 (weak; for dev only)
  { id: 2, username: 'freddy', password: '$2a$10$TEliRTMWGqqoLV0TyNFSIOi2QbYJi24Wttd3OcnkbZuA1SdsZRCl2', role: 'admin' }
];
const allowDefaults = process.env.ALLOW_DEFAULT_USERS === '1' || (process.env.NODE_ENV !== 'development');
const users = allowDefaults ? seedUsers : [];
if (!allowDefaults && seedUsers.length) {
  logger.warn('Default in-memory users disabled in development. Set ALLOW_DEFAULT_USERS=1 to re-enable (NOT RECOMMENDED).');
}
if ((process.env.JWT_SECRET || '').length < 24) {
  logger.warn('Weak JWT_SECRET detected (<24 chars). Consider setting a stronger secret.');
}

// Login endpoint
router.post('/login', [
  body('username')
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_\-]+$/).withMessage('Username may only contain alphanumerics, underscore and dash'),
  // Relax password policy in non-development unless STRICT_PASSWORDS=1
  (() => {
  const strict = (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEFAULT_USERS !== '1') || process.env.STRICT_PASSWORDS === '1';
    let chain = body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a digit');
    if (strict) {
      chain = chain.matches(/[A-Z]/).withMessage('Password must contain an uppercase letter');
    }
    return chain;
  })()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    logger.info('Auth login attempt', { username, hasPassword: typeof password === 'string', usersLoaded: users.length, allowDefaults });

    if (users.length === 0) {
      // In dev this indicates ALLOW_DEFAULT_USERS not set or persistent store not implemented yet
      logger.warn('Login attempt while no users are loaded', { username });
      return res.status(503).json({ error: 'Authentication temporarily unavailable (no users loaded). Set ALLOW_DEFAULT_USERS=1 or provision users.' });
    }

    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      logger.warn('Login attempt with invalid username', {
        username,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      logger.error('bcrypt compare failed', { username, error: e.message });
      return res.status(500).json({ error: 'Password verification error' });
    }
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', {
        username,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    logger.info('Successful login', {
      username: user.username,
      userId: user.id,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
});

// Token validation endpoint
router.get('/validate', (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        valid: false, 
        error: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid token format' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid token' 
      });
    }
    
    next(error);
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // by removing the token from storage
  logger.info('User logged out', {
    ip: req.ip
  });
  
  res.json({
    message: 'Logged out successfully'
  });
});

export default router;
