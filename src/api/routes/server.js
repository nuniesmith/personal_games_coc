import express from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { io } from '../server.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server status tracking (dedicated server concept removed)
// This app now focuses on Clash of Clans API data only. The previous
// fields (name/maxPlayers/password/port/version) have been eliminated.
let serverStatus = {
  running: false,            // retained only for backward compatibility (unused)
  players: [],               // may later reflect clan members / online status
  metrics: {
    cpu: 0,
    memory: 0,
    uptime: 0,
    connections: 0
  },
  clashApi: {
    clanTag: process.env.COC_CLAN_TAG || '',
    apiReachable: false,
    lastApiCheck: null
  },
  lastUpdate: new Date().toISOString()
};

// Get server status
router.get('/status', (req, res) => {
  logger.info('Server status requested', { user: req.user.username });
  
  res.json({
    success: true,
    data: serverStatus
  });
});

// Get server metrics
router.get('/metrics', async (req, res, next) => {
  try {
    // In a real implementation, you would gather actual metrics
    // For now, we'll simulate some realistic data
    const metrics = {
      cpu: Math.random() * 30 + 10, // 10-40% CPU usage
      memory: Math.random() * 40 + 20, // 20-60% memory usage
      uptime: serverStatus.running ? Date.now() - new Date(serverStatus.lastUpdate).getTime() : 0,
      connections: serverStatus.players.length,
      networkIn: Math.random() * 1000, // KB/s
      networkOut: Math.random() * 500, // KB/s
      diskUsage: 45.2, // Static for now
      timestamp: new Date().toISOString()
    };

    serverStatus.metrics = metrics;

    logger.info('Server metrics collected', { 
      user: req.user.username,
      cpu: metrics.cpu.toFixed(1),
      memory: metrics.memory.toFixed(1)
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    next(error);
  }
});

// Get connected players
router.get('/players', (req, res) => {
  logger.info('Player list requested', { user: req.user.username });
  
  res.json({
    success: true,
    data: serverStatus.players
  });
});

// Start server
// Deprecated: start endpoint no longer applicable (dedicated server removed)
router.post('/start', (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Operation not supported: no dedicated game server managed by this service.'
  });
});

// Stop server
router.post('/stop', (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Operation not supported: no dedicated game server managed by this service.'
  });
});

// Restart server
router.post('/restart', (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Operation not supported: no dedicated game server managed by this service.'
  });
});

// Get server logs
router.get('/logs', async (req, res, next) => {
  try {
    const { lines = 100 } = req.query;
    
    logger.info('Server logs requested', { 
      user: req.user.username,
      lines: parseInt(lines)
    });

    // In a real implementation, you would read actual COC server logs
    // For now, we'll return simulated log entries
    const simulatedLogs = [
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Server started successfully' },
      { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'Player "TruckerJoe" connected' },
      { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'WARN', message: 'High CPU usage detected' },
      { timestamp: new Date(Date.now() - 180000).toISOString(), level: 'INFO', message: 'Mod update completed' },
      { timestamp: new Date(Date.now() - 240000).toISOString(), level: 'ERROR', message: 'Failed to load texture: road_sign_01.dds' }
    ];

    res.json({
      success: true,
      data: simulatedLogs.slice(0, parseInt(lines))
    });

  } catch (error) {
    next(error);
  }
});

export default router;
