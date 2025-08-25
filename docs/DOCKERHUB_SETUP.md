# DockerHub Integration Setup for COC Server
# ==========================================

## 🎯 Overview

Your COC Server Management System now supports automated Docker image builds and deployment via DockerHub. This enables:

- **Automated CI/CD**: GitHub Actions builds and pushes images on every commit
- **Easy Deployment**: Pull pre-built images instead of building locally
- **Multi-Platform Support**: Images built for both AMD64 and ARM64 architectures
- **Version Management**: Tagged releases with automatic latest updates

## 📁 New Directory Structure

```
coc/
├── src/                           # ← All source code moved here
│   ├── api/                       # Node.js API server
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── server.js
│   │   └── ...
│   └── web/                       # React web application
│       ├── Dockerfile
│       ├── package.json
│       ├── nginx.conf
│       └── ...
├── .github/workflows/
│   └── coc-deploy.yml             # ← Updated with DockerHub integration
├── docker-compose.yml             # ← Updated for src/ structure
├── docker-compose.prod.yml        # ← New: Production with DockerHub images
├── Dockerfile.stack               # ← New: Complete stack in single container
├── deploy-dockerhub.sh            # ← New: Enhanced deployment script (Linux)
├── deploy-dockerhub.bat           # ← New: Enhanced deployment script (Windows)
└── ...
```

## 🔧 Required GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# DockerHub Authentication
DOCKERHUB_USERNAME=nuniesmith
DOCKERHUB_TOKEN=your_dockerhub_access_token

# Existing secrets (already configured)
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ZONE_ID=your_zone_id
# ... other existing secrets
```

### How to Get DockerHub Token:
1. Go to [DockerHub Account Settings](https://hub.docker.com/settings/security)
2. Click "New Access Token"
3. Name: "GitHub Actions COC"
4. Permissions: "Read, Write, Delete"
5. Copy the generated token to GitHub Secrets

## 🐳 DockerHub Images

All images are published to: **`nuniesmith/coc`**

### Available Tags:
- `nuniesmith/coc:web-latest` - Latest web application
- `nuniesmith/coc:api-latest` - Latest API server
- `nuniesmith/coc:latest` - Complete stack (web + API + nginx)
- `nuniesmith/coc:web-v1.0.0` - Specific version tags
- `nuniesmith/coc:api-v1.0.0` - Specific version tags

## 🚀 Deployment Options

### Option 1: Local Development (Build Images Locally)
```bash
# Linux/macOS
./deploy.sh start

# Windows
deploy.bat start
```

### Option 2: Production (Use DockerHub Images)
```bash
# Linux/macOS
./deploy-dockerhub.sh start prod        # Use latest images
./deploy-dockerhub.sh start prod v1.2.3 # Use specific version

# Windows
deploy-dockerhub.bat start prod         # Use latest images
deploy-dockerhub.bat start prod v1.2.3  # Use specific version
```

### Option 3: Docker Compose with Environment Variables
```bash
# Set image versions and start
export WEB_IMAGE=nuniesmith/coc:web-latest
export API_IMAGE=nuniesmith/coc:api-latest
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 Automated Workflow

### When you push to `main` branch:
1. **GitHub Actions triggered**
2. **Docker images built** for web and API
3. **Images pushed to DockerHub** with tags:
   - `latest` (for main branch)
   - `YYYYMMDD-HHMMSS-{git-sha}` (timestamped version)
4. **Deploy to server** (if configured)

### For feature branches:
- Images tagged with branch name (e.g., `feature-auth-latest`)
- No automatic deployment

## 📋 Available Commands

### Enhanced Deployment Script (`deploy-dockerhub.sh/.bat`):

```bash
# Start services
deploy-dockerhub.sh start              # Local build
deploy-dockerhub.sh start prod         # DockerHub latest
deploy-dockerhub.sh start prod v1.2.3  # Specific version

# Manage images
deploy-dockerhub.sh pull latest        # Pull latest from DockerHub
deploy-dockerhub.sh build              # Build images locally
deploy-dockerhub.sh update v1.2.3      # Update to specific version

# Monitor services
deploy-dockerhub.sh status             # Check health
deploy-dockerhub.sh logs               # View all logs
deploy-dockerhub.sh logs coc-web       # Specific service logs

# Maintenance
deploy-dockerhub.sh restart prod       # Restart with DockerHub images
deploy-dockerhub.sh cleanup            # Remove all containers/images
```

## 🔍 Version Management

### Automatic Versioning:
- **Latest**: Always points to most recent main branch build
- **Timestamped**: `20240723-143052-a1b2c3d` format
- **Tagged Releases**: Manual tags like `v1.0.0`, `v1.1.0`

### To Deploy Specific Version:
```bash
# List available tags
curl -s https://hub.docker.com/v2/repositories/nuniesmith/coc/tags/ | jq '.results[].name'

# Deploy specific version
./deploy-dockerhub.sh start prod 20240723-143052-a1b2c3d
```

## 🛠️ Development Workflow

### 1. Local Development:
```bash
# Make changes to src/api/ or src/web/
git add .
git commit -m "feat: add new feature"

# Test locally
./deploy.sh start
./deploy.sh logs
```

### 2. Production Deployment:
```bash
# Push to main branch (triggers CI/CD)
git push origin main

# Monitor GitHub Actions
# Images automatically built and pushed

# Deploy latest images
./deploy-dockerhub.sh start prod
```

### 3. Rollback if Needed:
```bash
# Check previous versions
curl -s https://hub.docker.com/v2/repositories/nuniesmith/coc/tags/ | jq '.results[].name'

# Rollback to previous version
./deploy-dockerhub.sh start prod 20240722-120000-xyz123
```

## 🔐 Security & Best Practices

### DockerHub Repository Settings:
- Repository: `nuniesmith/coc` (matches GitHub repo)
- Visibility: **Public** (for easy access) or **Private** (for security)
- Automated builds: **Disabled** (using GitHub Actions instead)

### Image Security:
- **Multi-stage builds** for smaller images
- **Non-root users** in containers
- **Minimal base images** (Alpine Linux)
- **Security scanning** via GitHub Actions

### Environment Management:
- **Separate configurations** for dev/staging/prod
- **Environment variables** for secrets
- **Health checks** for all services

## 🐛 Troubleshooting

### Common Issues:

#### Docker Build Fails:
```bash
# Check if in correct directory
pwd  # Should show coc/ directory

# Verify Docker is running
docker --version
docker-compose --version

# Check source structure
ls -la src/  # Should show api/ and web/
```

#### DockerHub Pull Fails:
```bash
# Check image exists
docker search nuniesmith/coc

# Manual pull test
docker pull nuniesmith/coc:web-latest
docker pull nuniesmith/coc:api-latest

# Check GitHub Actions logs for build status
```

#### Services Won't Start:
```bash
# Check logs
./deploy-dockerhub.sh logs

# Check status
./deploy-dockerhub.sh status

# Verify environment file
cat .env

# Test health endpoints
curl http://localhost/health
curl http://localhost:3001/health
```

## 📊 Monitoring

### GitHub Actions Dashboard:
- Go to repository → Actions tab
- Monitor build status and deployment logs
- Check DockerHub push success

### DockerHub Dashboard:
- [Repository Overview](https://hub.docker.com/r/nuniesmith/coc)
- View image sizes and download stcoc
- Check automated builds status

### Local Monitoring:
```bash
# Service health
./deploy-dockerhub.sh status

# Resource usage
docker stcoc

# Image information
docker images | grep nuniesmith/coc
```

## 🎯 Next Steps

1. **Test the Setup**:
   ```bash
   # Push a small change to trigger CI/CD
   echo "Test update" >> README.md
   git add . && git commit -m "test: trigger CI/CD"
   git push origin main
   ```

2. **Monitor Build**:
   - Check GitHub Actions tab
   - Verify images appear on DockerHub

3. **Deploy with DockerHub**:
   ```bash
   ./deploy-dockerhub.sh start prod
   ```

4. **Set Up Production Server**:
   - Configure server with deployment scripts
   - Set up automated deployments
   - Configure monitoring and alerting

---

**🎮 Your COC Server is now ready for professional Docker-based deployment!** 🚛
