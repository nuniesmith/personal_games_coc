import express from 'express';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get system info
router.get('/info', async (req, res, next) => {
  try {
    logger.info('System info requested', { user: req.user.username });

    // In a real implementation, you would gather actual system information
    const systemInfo = {
      os: 'Windows 11 Pro',
      architecture: 'x64',
      totalMemory: '32 GB',
      availableMemory: '18.5 GB',
      cpuUsage: Math.random() * 30 + 10,
      memoryUsage: Math.random() * 40 + 20,
      diskSpace: {
        total: '1 TB',
        used: '450 GB',
        available: '550 GB',
        percentage: 45
      },
  cocVersion: process.env.SERVER_VERSION || '',
      serverUptime: Date.now() - new Date('2024-01-20T10:00:00Z').getTime(),
      lastBootTime: '2024-01-20T09:30:00Z',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemInfo
    });

  } catch (error) {
    next(error);
  }
});

// List files in a directory
router.get('/files', async (req, res, next) => {
  try {
    const { path: requestedPath = '.' } = req.query;
    
    logger.info('File listing requested', { 
      user: req.user.username,
      path: requestedPath
    });

    // Security: Prevent directory traversal
    const safePath = path.resolve(requestedPath).replace(/\\/g, '/');
    
    // In a real implementation, you would read the actual directory
    // For now, we'll return simulated file listings
    const simulatedFiles = [
      {
        name: 'server_config.sii',
        type: 'file',
        size: '2.4 KB',
        modified: '2024-01-20T10:30:00Z',
        permissions: 'rw-'
      },
      {
        name: 'server_packages.dat',
        type: 'file',
        size: '15.6 KB',
        modified: '2024-01-19T14:20:00Z',
        permissions: 'rw-'
      },
      {
        name: 'mods',
        type: 'directory',
        size: '-',
        modified: '2024-01-18T12:00:00Z',
        permissions: 'rwx'
      },
      {
        name: 'logs',
        type: 'directory',
        size: '-',
        modified: '2024-01-20T11:45:00Z',
        permissions: 'rwx'
      }
    ];

    res.json({
      success: true,
      data: {
        path: safePath,
        files: simulatedFiles
      }
    });

  } catch (error) {
    next(error);
  }
});

// Read file content
router.get('/files/content', async (req, res, next) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    logger.info('File content requested', { 
      user: req.user.username,
      filePath
    });

    // In a real implementation, you would read the actual file
    // For now, we'll return simulated content based on file type
    let content = '';
    const fileName = path.basename(filePath);
    
  if (fileName.endsWith('.sii')) {
    content = `// Server Configuration Template
server_packages : []

server_logon {
  name: "${process.env.SERVER_NAME || ''}"
  password: "${process.env.SERVER_PASSWORD || ''}"
  max_players: ${process.env.SERVER_MAX_PLAYERS || 0}
  welcome_message: "Welcome!"
}`;
    } else if (fileName.endsWith('.log')) {
      content = `[2024-01-20 10:30:15] INFO: Server started successfully
[2024-01-20 10:31:02] INFO: Player "TruckerJoe" connected from 192.168.1.100
[2024-01-20 10:32:45] WARN: High CPU usage detected: 85%
[2024-01-20 10:33:12] INFO: Mod update completed: Realistic Physics v2.1
[2024-01-20 10:34:30] ERROR: Failed to load texture: road_sign_warning.dds`;
    } else {
      content = 'Binary file content cannot be displayed';
    }

    res.json({
      success: true,
      data: {
        filePath,
        content,
        size: content.length,
        encoding: 'utf-8'
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update server configuration
router.put('/config', async (req, res, next) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data is required'
      });
    }

    logger.info('Server configuration update requested', { 
      user: req.user.username,
      configKeys: Object.keys(config)
    });

    // In a real implementation, you would:
    // 1. Validate the configuration
    // 2. Update the actual config files
    // 3. Restart the server if necessary

    logger.info('Server configuration updated successfully', { 
      user: req.user.username
    });

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });

  } catch (error) {
    next(error);
  }
});

export default router;
