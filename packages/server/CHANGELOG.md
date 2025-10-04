# Changelog - @climber/server

All notable changes to the Mountain Climber server package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Authentication and authorization system
- User management
- Project templates and favorites
- Scheduled tasks and automation
- Advanced log streaming with filters
- Performance metrics and monitoring API
- Notification system

## [1.0.0] - 2025-10-04

### Added
- **REST API Server**: Express.js-based REST API for Docker project management
  - Projects API: List, start, stop, restart, bulk operations
  - Hooks API: List available hooks and execute them
  - Git API: Status, pull, and sync operations
  - Workspaces API: List, get current, and switch workspaces
  - Logs API: Get project logs
  - Health check endpoint
- **WebSocket Support**: Real-time updates with Socket.IO
  - Project status subscriptions with automatic updates
  - Log streaming subscriptions
  - Automatic reconnection handling
  - Error broadcasting to connected clients
- **Security Middleware**:
  - Helmet.js for security headers
  - Configurable CORS support
  - Compression middleware for faster responses
  - Request body parsing with limits
- **Static File Serving**: Serves web dashboard build
  - Automatic SPA routing fallback
  - Graceful handling of missing build
  - Production-ready static file serving
- **Configuration**:
  - Environment variable support (PORT, HOST, CORS_ORIGIN)
  - Configurable port and host binding
  - Auto-open browser option
  - Dynamic CORS origin configuration
- **Integration with @climber/core**:
  - Direct access to config manager
  - Docker Compose operations via core library
  - Hooks execution through core engine
  - Git operations through core VCS module
  - Workspace management through core
- **Comprehensive Test Suite**:
  - 52 tests covering all functionality
  - API endpoint tests (46 tests)
  - WebSocket functionality tests (6 tests)
  - Mock infrastructure for dependencies
  - 100% API endpoint coverage

### API Endpoints

**Projects:**
- `GET /api/projects` - List all projects with status
- `GET /api/projects/:name` - Get specific project details
- `POST /api/projects/:name/start` - Start a project
- `POST /api/projects/:name/stop` - Stop a project
- `POST /api/projects/:name/restart` - Restart a project
- `POST /api/projects/bulk/start` - Start multiple projects
- `POST /api/projects/bulk/stop` - Stop multiple projects

**Hooks:**
- `GET /api/hooks` - List all available hooks
- `POST /api/hooks/execute` - Execute a hook on projects

**Git:**
- `GET /api/git/status` - Get git status for all projects
- `POST /api/git/pull` - Pull changes from remote
- `POST /api/git/sync` - Sync with remote (fetch + pull)

**Workspaces:**
- `GET /api/workspaces` - List all workspaces
- `GET /api/workspaces/current` - Get current workspace
- `POST /api/workspaces/switch` - Switch to different workspace

**Logs:**
- `GET /api/logs/:project` - Get logs for a project

**Health:**
- `GET /api/health` - Server health check

### WebSocket Events

**Client → Server:**
- `subscribe:projects` - Subscribe to project status updates
- `subscribe:logs` - Subscribe to log updates for a project

**Server → Client:**
- `connected` - Connection established with client ID
- `projects:status` - Project status update broadcast
- `logs:data` - Log data for subscribed project
- `error` - Error message

### Technical Stack
- Express.js 4.18 - Web framework
- Socket.IO 4.6 - WebSocket implementation
- CORS 2.8 - Cross-origin resource sharing
- Helmet 7.1 - Security headers
- Compression 1.7 - Response compression
- Body-parser 1.20 - Request parsing
- Open 9.1 - Auto-open browser
- Docker-compose 0.24 - Docker operations
- Jest 29.7 - Testing framework
- Supertest 6.3 - API endpoint testing

### Fixed
- Route ordering in projects.js - moved bulk operations before `:name` routes
- Workspace dependency syntax for Yarn 1.x compatibility (`"*"` instead of `"workspace:*"`)
- WebSocket logs test with proper docker-compose mock
- Express route matching for bulk operations

### Changed
- Updated package.json with comprehensive test scripts:
  - `test` - Run all tests with Jest
  - `test:watch` - Run tests in watch mode
  - `test:coverage` - Generate coverage report
- Added development dependencies for testing
- Enhanced error handling across all endpoints

### Test Results
```
Test Suites: 6 passed, 6 total
Tests:       52 passed, 52 total
Coverage:    100% of API endpoints
Time:        ~3.3s
```

**Test Breakdown:**
- Projects API: 18 tests
- Hooks API: 12 tests
- Git API: 6 tests
- Workspaces API: 5 tests
- Logs API: 5 tests
- WebSocket: 6 tests

### Documentation
- API endpoint documentation in README
- WebSocket event documentation
- Development and testing guides
- Environment variable reference
- Integration examples

### Installation Notes
1. Enabled Corepack for Yarn support: `corepack enable`
2. Fixed workspace dependency syntax for Yarn 1.x compatibility
3. Successfully installed all dependencies
4. Integrated with @climber/core and @climber/web packages

---

## Running Tests

```bash
# All tests
yarn test

# Watch mode
yarn test:watch

# With coverage
yarn test:coverage

# From monorepo root
yarn test:server
```

---

**Status**: Production Ready ✅  
**Test Coverage**: 100% API endpoints  
**All Tests**: Passing ✅
