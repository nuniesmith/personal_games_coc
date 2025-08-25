# Clash of Clans Clan Tools API

A Node.js/Express API server providing Clash of Clans clan / player data aggregation, caching, metrics and a real-time web interface.

## 🚀 Features

- **Clan Data**: Clan, members, capital, wars, league group, raid seasons
- **Player Data**: Player profiles, token verification
- **Leagues & Labels**: Locations, labels, leagues, gold pass info
- **Caching**: Redis + in-memory hybrid cache for CoC API responses
- **Real-time Monitoring**: WebSocket-based live updates (future expansion)
- **Authentication**: JWT-based auth + service token for internal diagnostics
- **Metrics**: Prometheus endpoint with rate limit & cache stats
- **Authentication**: JWT-based authentication system
- **(Planned) File Insights**: Read-only inspection of cached responses (future)
- **Logging**: Comprehensive logging with Winston
- **Security**: Rate limiting, CORS, and helmet security middleware

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
Optional but recommended:
- **Redis** (for improved caching performance)

## 🛠️ Installation

1. **Clone or navigate to the API directory**:

```bash
cd api
```

1. **Install dependencies**:

```bash
npm install
```

1. **Configure environment**:

```bash
cp .env.example .env
# Edit .env file with your configuration
```

1. **Start development server**:

```bash
npm run dev
```

## ⚙️ Configuration

Edit the `.env` file with your specific settings:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-development

# Clash of Clans API
COC_API_BASE_URL=https://api.clashofclans.com/v1
COC_API_TOKEN=your-primary-token
# or provide multiple (comma separated)
COC_API_TOKENS=token1,token2

# Optional Cloudflare (if you front this API)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/logout` - User logout

### Clash of Clans (Primary)

- `GET /api/coc/clan` (existing configured clan)
- `GET /api/coc/clan/members`
- `GET /api/coc/clan/warlog`
- `GET /api/coc/clan/currentwar`
- `GET /api/coc/clan/capitalraidseasons`
- `GET /api/coc/players/:playerTag`
- `POST /api/coc/players/:playerTag/verify-token`
- League Group: `GET /api/coc/clan/warleaguegroup`
- Locations: `GET /api/coc/locations`
- Labels: `GET /api/coc/labels/clans`, `GET /api/coc/labels/players`
- Leagues: `GET /api/coc/leagues`, `GET /api/coc/warleagues`, `GET /api/coc/capitalleagues`, `GET /api/coc/builderleagues`
- Gold Pass: `GET /api/coc/goldpass`

### Alias Endpoints (Official Path Style)

- `GET /api/coc/clans/:clanTag`
- `GET /api/coc/clans/:clanTag/members`
- `GET /api/coc/clans/:clanTag/warlog`
- `GET /api/coc/clans/:clanTag/currentwar`
- `GET /api/coc/players/:playerTag` (same as above)

### Diagnostics (Service Token Restricted)

- `GET /api/coc/_debug/tokens`
- `GET /api/coc/_debug/ratelimit`
- `POST /api/coc/_debug/cache/flush`

### System Management

- `GET /api/system/info` - Get system information
- `GET /api/system/files` - List files in directory
- `GET /api/system/files/content` - Read file content
- `GET /api/system/config` - Get server configuration
- `PUT /api/system/config` - Update server configuration

## 🔄 WebSocket

Reserved for future real-time clan / war update streaming.

## 🔐 Authentication

The API uses JWT tokens for authentication (no default credentials shipped— configure your own user provisioning flow).

Include the JWT token in requests:

```http
Authorization: Bearer <your-jwt-token>
```

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Error Handling**: Comprehensive error handling middleware

## 📊 Monitoring & Logging

- **Winston Logging**: Structured logging to files and console
- **Health Check**: Available at `/health`
- **Prometheus Metrics**: `/metrics` endpoint (rate limits, cache, process)

## 🚀 Production Deployment

1. **Set development environment**:

   ```env
   NODE_ENV=development
   ```

2. **Update security settings**:
   - Change default JWT secret
   - Update CORS origin to development URL
   - Configure proper COC server paths

3. **Start development server**:

   ```bash
   npm start
   ```

## 🔧 Development

- **Development server with auto-reload**:

   ```bash
   npm run dev
   ```

- **Run tests**:

   ```bash
   npm test
   ```

- **Watch tests**:

   ```bash
   npm run test:watch
   ```

## 📁 Project Structure

```text
api/
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   └── system.js    # System management routes
├── middleware/      # Express middleware
│   ├── auth.js      # JWT authentication
│   └── errorHandler.js
├── sockets/         # WebSocket handlers
│   └── handlers.js  # Socket.IO event handlers
├── utils/           # Utility functions
│   └── logger.js    # Winston logging configuration
├── logs/            # Log files (created automatically)
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
├── .env.example     # Environment configuration template
└── README.md        # This file
```

## 🤝 Integration

Works with the provided React frontend (clan dashboard) or any external bot / service needing cached CoC data. Use Bearer authentication for protected endpoints.

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   - Change `PORT` in `.env` file
   - Or kill the process using the port

2. **CORS errors**:
   - Verify `FRONTEND_URL` in `.env` matches your React app URL

3. **Authentication fails**:
   - Check JWT secret configuration
   - Verify token format in requests

4. **WebSocket connection fails**:
   - Check firewall settings
   - Verify Socket.IO client configuration

### Logs

Check the log files for detailed error information:

- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

## 📄 License

MIT License - see LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Author**: Feast or Famine Tools  
**Version**: 1.0.0  
**Last Updated**: August 2025
