# COC Server Management - Docker Deployment
# ==========================================

A complete Docker-based deployment solution for the COC Server Management System.

## 🚀 Quick Start

### Windows
```batch
# Start everything
deploy.bat start

# View logs
deploy.bat logs

# Stop services
deploy.bat stop
```

### Linux/macOS
```bash
# Make script executable
chmod +x deploy.sh

# Start everything
./deploy.sh start

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose Stack                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Nginx     │  │ React Web   │  │ Node.js API │         │
│  │ (Reverse    │  │    App      │  │   Server    │         │
│  │  Proxy)     │  │ (Frontend)  │  │ (Backend)   │         │
│  │   :443      │  │    :80      │  │   :3001     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                 │                 │              │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │   Redis     │  │         Shared Volumes              │   │
│  │ (Sessions)  │  │  • coc-data (persistent data)      │   │
│  │   :6379     │  │  • coc-logs (application logs)     │   │
│  └─────────────┘  │  • redis-data (session storage)    │   │
│                   │  • nginx-logs (access logs)        │   │
│                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Services

### React Web Application (coc-web)
- **Port**: 80
- **Technology**: React 18 + Vite + TailwindCSS
- **Features**: Real-time dashboard
- **Health Check**: `http://localhost/health`

### Node.js API Server (coc-api)
- **Port**: 3001
- **Technology**: Express.js + Socket.IO
- **Features**: RESTful API, WebSocket real-time updates
- **Health Check**: `http://localhost:3001/health`

### Redis (redis)
- **Port**: 6379
- **Purpose**: Session storage and caching
- **Data**: Persistent via volume

### Nginx (nginx)
- **Port**: 443 (HTTPS)
- **Purpose**: Reverse proxy, SSL termination, static file serving
- **Features**: Gzip compression, security headers

## 🔧 Configuration

### Environment Variables

The system uses a `.env` file for configuration:

```env
# Security
JWT_SECRET=your-jwt-secret-change-this-in-development

# Domain Configuration
DOMAIN_NAME=coc.feastorfamine.test

# (Legacy dedicated server & Steam collection configuration removed)

# External Services (Optional)
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id
DISCORD_WEBHOOK_URL=your-discord-webhook
```

### Docker Compose Override

For development, create `docker-compose.override.yml`:

```yaml
services:
  coc-web:
    ports:
      - "3000:80"  # Different port for development
    
  coc-api:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    volumes:
      - ./api:/app  # Live code reload
```

## 🚀 Deployment Commands

### Development Deployment

```bash
# Quick start for development
./deploy.sh start

# Build images only
./deploy.sh build

# View real-time logs
./deploy.sh logs

# Check service status
./deploy.sh status
```

### Production Deployment

```bash
# 1. Set development environment
export NODE_ENV=development

# 2. Update configuration
vim .env

# 3. Deploy with development settings
./deploy.sh start

# 4. Verify deployment
curl -f http://localhost/health
curl -f http://localhost:3001/health
```

### Maintenance Commands

```bash
# Restart services
./deploy.sh restart

# Stop all services
./deploy.sh stop

# Complete cleanup (removes containers and images)
./deploy.sh cleanup

# Update to latest code
git pull origin main
./deploy.sh restart
```

## 🔍 Monitoring & Debugging

### Health Checks

- **Web App**: `http://localhost/health`
- **API Server**: `http://localhost:3001/health`
- **Redis**: `docker-compose exec redis redis-cli ping`

### Log Analysis

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs coc-web
docker-compose logs coc-api

# Follow logs in real-time
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Performance Monitoring

```bash
# Container resource usage
docker stcoc

# Service status
docker-compose ps

# Detailed container info
docker inspect coc-web-app
```

## 🛡️ Security Features

### Network Security

- **Internal Network**: All services communicate via Docker network
- **Exposed Ports**: Only 80 (HTTP) and 443 (HTTPS) exposed externally
- **Reverse Proxy**: Nginx handles all external traffic

### Application Security

- **JWT Authentication**: Secure API access
- **Rate Limiting**: Prevents abuse
- **Security Headers**: CORS, XSS protection, etc.
- **Input Validation**: All API inputs validated

### Data Security

- **Volume Encryption**: Persistent data stored in Docker volumes
- **Secret Management**: Environment variables for sensitive data
- **Access Control**: User-based permissions

## 🔄 CI/CD Integration

### GitHub Actions

The included workflow automatically:

1. **Builds** Docker images
2. **Tests** image functionality
3. **Deploys** to remote servers
4. **Updates** DNS records
5. **Sends** Discord notifications

### Manual Deployment

```bash
# 1. Build and tag images
docker build -t coc-web:v1.0.0 ./web
docker build -t coc-api:v1.0.0 ./api

# 2. Push to registry (optional)
docker push your-registry/coc-web:v1.0.0
docker push your-registry/coc-api:v1.0.0

# 3. Deploy on target server
scp docker-compose.yml user@server:/app/
ssh user@server "cd /app && docker-compose up -d"
```

## 🐛 Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using port 80
netstat -tulpn | grep :80

# Use different ports
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### Permission Issues

```bash
# Fix volume permissions
sudo chown -R 1001:1001 ./data
sudo chown -R 1001:1001 ./logs
```

#### Container Won't Start

```bash
# Check container logs
docker-compose logs coc-web

# Check Docker daemon
systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

#### Memory Issues

```bash
# Check system resources
free -h
df -h

# Clean up Docker
docker system prune -a
```

### Service-Specific Issues

#### Web App Not Loading

1. Check if container is running: `docker-compose ps`
2. Check health endpoint: `curl http://localhost/health`
3. Check logs: `docker-compose logs coc-web`
4. Check nginx configuration: `docker-compose exec nginx nginx -t`

#### API Connection Issues

1. Verify API is running: `curl http://localhost:3001/health`
2. Check WebSocket connection: Browser dev tools → Network tab
3. Verify environment variables: `docker-compose exec coc-api env`

## 📈 Performance Optimization

### Production Optimizations

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  coc-web:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### Caching Strategy

- **Nginx**: Static asset caching with long expiry
- **Redis**: Session and API response caching
- **Browser**: Aggressive caching for static resources

## 🔧 Customization

### Adding New Services

1. Add service to `docker-compose.yml`
2. Update nginx configuration if needed
3. Add health checks and monitoring

### Environment-Specific Config

Create environment-specific compose files:

- `docker-compose.dev.yml` - Development overrides
- `docker-compose.staging.yml` - Staging configuration
- `docker-compose.prod.yml` - Production optimizations

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline comments
- **Logs**: Always check container logs first
- **Health Checks**: Verify all services are healthy
- **GitHub Issues**: Report bugs and request features

### Useful Commands Reference

```bash
# Quick health check
curl -f http://localhost/health && echo "✅ Web OK"
curl -f http://localhost:3001/health && echo "✅ API OK"

# Resource usage
docker stcoc --no-stream

# Cleanup unused resources
docker system prune -f

# Update images
docker-compose pull
docker-compose up -d --remove-orphans
```

---

**🎮 Happy Trucking with COC Server Management!** 🚛
