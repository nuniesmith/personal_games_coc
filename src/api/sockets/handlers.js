import { logger } from '../utils/logger.js';
import { cocApi } from '../utils/cocApi.js';
import { sendDiscordMessage } from '../utils/discord.js';

let connectedClients = new Map();
let serverMetrics = {
  cpu: 0,
  memory: 0,
  connections: 0,
  lastUpdate: Date.now()
};

export const initializeSocketHandlers = (io) => {
  logger.info('🔌 Initializing Socket.IO handlers');

  io.on('connection', (socket) => {
    logger.info('Client connected', { 
      socketId: socket.id,
      clientIP: socket.request.connection.remoteAddress
    });

    // Store client connection
    connectedClients.set(socket.id, {
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      userAgent: socket.request.headers['user-agent']
    });

    // Send initial connection confirmation
    socket.emit('connectionConfirmed', {
      message: 'Connected to COC Server Management API',
      timestamp: new Date().toISOString(),
      socketId: socket.id
    });

    // Join server monitoring room
    socket.join('serverMonitoring');

    // Handle authentication
    socket.on('authenticate', (data) => {
      try {
        // In a real implementation, you would verify the JWT token
        const { token } = data;
        
        if (token) {
          logger.info('Socket authentication successful', { 
            socketId: socket.id 
          });
          
          socket.emit('authenticationSuccess', {
            message: 'Socket authenticated successfully'
          });
          
          // Join authenticated room for privileged updates
          socket.join('authenticated');
        } else {
          throw new Error('No token provided');
        }
      } catch (error) {
        logger.warn('Socket authentication failed', {
          socketId: socket.id,
          error: error.message
        });
        
        socket.emit('authenticationError', {
          error: 'Authentication failed'
        });
      }
    });

    // Handle server status requests
    socket.on('requestServerStatus', () => {
      // Emit current server status
      socket.emit('serverStatusUpdate', {
        type: 'statusResponse',
        status: {
          running: Math.random() > 0.5,
          players: generateRandomPlayers(),
          metrics: serverMetrics,
          lastUpdate: new Date().toISOString()
        }
      });
    });

    // Handle real-time chat (if implemented)
    socket.on('chatMessage', (data) => {
      try {
        const { message, username } = data;
        
        if (!message || !username) {
          throw new Error('Message and username are required');
        }

        logger.info('Chat message received', {
          socketId: socket.id,
          username,
          messageLength: message.length
        });

        // Broadcast to all authenticated clients
        io.to('authenticated').emit('chatMessage', {
          id: Date.now().toString(),
          username,
          message,
          timestamp: new Date().toISOString(),
          type: 'user'
        });

      } catch (error) {
        logger.warn('Chat message error', {
          socketId: socket.id,
          error: error.message
        });
        
        socket.emit('chatError', {
          error: 'Failed to send message'
        });
      }
    });

    // Handle heartbeat/ping
    socket.on('ping', (data) => {
      // Update last seen time
      if (connectedClients.has(socket.id)) {
        connectedClients.get(socket.id).lastSeen = Date.now();
      }
      
      // Respond with pong and server metrics
      socket.emit('pong', {
        timestamp: Date.now(),
        serverMetrics: serverMetrics,
        connections: connectedClients.size
      });
    });

    // Handle client disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        reason,
        duration: connectedClients.has(socket.id) 
          ? Date.now() - connectedClients.get(socket.id).connectedAt 
          : 0
      });

      // Remove from connected clients
      connectedClients.delete(socket.id);
      
      // Update connection count
      updateServerMetrics();
    });

    // Update connection count
    updateServerMetrics();
  });

  // Start periodic updates
  startPeriodicUpdates(io);
};


function updateServerMetrics() {
  serverMetrics = {
    cpu: Math.random() * 30 + 10,
    memory: Math.random() * 40 + 20,
    connections: connectedClients.size,
    lastUpdate: Date.now()
  };
}

function startPeriodicUpdates(io) {
  // Send server metrics updates every 5 seconds
  setInterval(() => {
    updateServerMetrics();
    
    io.to('authenticated').emit('metricsUpdate', {
      type: 'serverMetrics',
      data: serverMetrics,
      timestamp: new Date().toISOString()
    });
  }, 5000);

  // Send player updates every 10 seconds
  setInterval(() => {
    const players = generateRandomPlayers();
    io.to('authenticated').emit('playersUpdate', {
      type: 'playerList',
      data: players,
      timestamp: new Date().toISOString()
    });
  }, 10000);

  // Clean up stale connections every minute
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, clientInfo] of connectedClients.entries()) {
      if (now - clientInfo.lastSeen > staleThreshold) {
        logger.warn('Removing stale connection', { socketId });
        connectedClients.delete(socketId);
      }
    }
  }, 60000);

  // War status broadcast every 15s (only if in war)
  let lastStars = null;
  let lastNotify = 0;
  setInterval(async () => {
    try {
      const tag = process.env.COC_CLAN_TAG;
      if (!tag) return;
      const war = await cocApi.getCurrentWar(tag).catch(() => null);
      if (war && war.state && war.state !== 'notInWar') {
        io.to('authenticated').emit('war:update', {
          state: war.state,
          teamSize: war.teamSize,
          attacksPerMember: war.attacksPerMember,
          clan: war.clan ? { stars: war.clan.stars, destruction: war.clan.destructionPercentage, name: war.clan.name } : null,
          opponent: war.opponent ? { stars: war.opponent.stars, destruction: war.opponent.destructionPercentage, name: war.opponent.name } : null,
          timestamp: new Date().toISOString()
        });
        // Auto discord push if enabled and stars changed (cooldown 60s)
        if (process.env.WAR_AUTO_DISCORD === '1' && war.clan) {
          const currentStars = `${war.clan.stars}:${war.opponent?.stars || 0}`;
          const now = Date.now();
          if (lastStars && currentStars !== lastStars && (now - lastNotify) > 60_000) {
            lastNotify = now;
            sendDiscordMessage('War stars update', { embeds: [{
              title: `War Update (${war.state})`,
              description: `${war.clan.name} ${war.clan.stars}⭐ (${Math.round(war.clan.destructionPercentage)}%) vs ${war.opponent?.name || 'Opponent'} ${war.opponent?.stars || 0}⭐ (${Math.round(war.opponent?.destructionPercentage || 0)}%)`,
              color: 0xff9900,
              timestamp: new Date().toISOString()
            }] }).catch(()=>{});
          }
          lastStars = currentStars;
        }
      }
    } catch (e) {
      logger.warn('war broadcast error', { error: e.message });
    }
  }, 15000);

  logger.info('✅ Socket.IO periodic updates started');
}

// Temporary mock player generator (removed real server integration)
function generateRandomPlayers() {
  const count = Math.floor(Math.random() * 5); // 0-4 players
  const names = ['Barbarian', 'Archer', 'Giant', 'Wizard', 'Dragon', 'P.E.K.K.A', 'Miner', 'HogRider'];
  return Array.from({ length: count }).map((_, i) => ({
    id: `${Date.now()}-${i}`,
    name: names[Math.floor(Math.random() * names.length)],
    trophies: Math.floor(Math.random() * 5000),
    level: Math.floor(Math.random() * 300) + 1,
    status: Math.random() > 0.2 ? 'online' : 'idle',
    joinedAt: new Date(Date.now() - Math.floor(Math.random() * 3600_000)).toISOString()
  }));
}
