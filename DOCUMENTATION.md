# Mountain Climber Documentation 🏔️

Complete documentation for Mountain Climber - Multi-project Docker orchestration tool.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core CLI Commands](#core-cli-commands)
3. [Command Hooks](#command-hooks)
4. [Git/VCS Operations](#gitvcs-operations)
5. [Web Dashboard](#web-dashboard)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Contributing](#contributing)

---

## Getting Started

### Installation

```bash
# Install all dependencies
yarn install

# Install core CLI globally
cd packages/core
npm link
```

### Quick Start

```bash
# Initialize a new workspace
climb init

# Start all projects
climb up

# Start the web dashboard
climb server

# Check project status
climb ps
```

---

## Core CLI Commands

### Basic Commands

#### `climb init`
Initialize a new workspace configuration.

```bash
climb init
```

#### `climb up`
Start all or specific Docker projects.

```bash
# Start all projects
climb up

# Start specific projects
climb up api frontend

# Start with rebuild
climb up --build
```

#### `climb down`
Stop all or specific Docker projects.

```bash
# Stop all projects
climb down

# Stop specific projects
climb down api frontend

# Remove volumes
climb down -v
```

#### `climb ps`
Show status of all projects.

```bash
climb ps
```

#### `climb logs`
View logs from projects.

```bash
# View logs from all projects
climb logs

# Follow logs
climb logs --follow

# Tail last 100 lines
climb logs --tail=100

# Logs for specific project
climb logs api
```

#### `climb restart`
Restart projects.

```bash
# Restart all projects
climb restart

# Restart specific projects
climb restart api
```

#### `climb clean`
Clean up Docker resources.

```bash
# Clean all unused resources
climb clean --all

# Clean specific resources
climb clean --volumes
climb clean --images
climb clean --networks
```

### Advanced Commands

#### `climb config`
Show current configuration.

```bash
climb config
```

#### `climb workspace`
Manage multiple workspaces.

```bash
# List workspaces
climb workspace list

# Create new workspace
climb workspace create production

# Switch workspace
climb workspace switch staging

# Delete workspace
climb workspace delete old-workspace
```

#### `climb run`
Execute custom commands.

```bash
# List available commands
climb run --list

# Run custom command
climb run install-deps

# Run on specific projects
climb run test api frontend

# Run in parallel
climb run build --parallel
```

---

## Command Hooks

### What are Hooks?

Hooks allow you to define standardized commands that execute differently across projects based on their technology stack.

### Configuring Hooks

Define hooks in your `config.yaml`:

```yaml
projects:
  - name: api
    path: backend/api
    description: Ruby on Rails API
    hooks:
      install-deps:
        command: bundle install
        description: Install Ruby gems
      test:
        command: bundle exec rspec
        description: Run tests

  - name: frontend
    path: web/frontend
    description: React frontend
    hooks:
      install-deps:
        command: npm install
        description: Install Node packages
      test:
        command: npm test
        description: Run tests

# Global hooks (apply to all projects)
hooks:
  clean-deps:
    command: rm -rf node_modules vendor
    description: Clean dependency directories
```

### Using Hooks

```bash
# Run a hook on all projects
climb hooks install-deps

# Run on specific projects
climb hooks test api frontend

# Run in parallel
climb hooks lint --parallel

# Interactive mode
climb hooks --interactive

# List available hooks
climb hooks --list
```

### Standard Hook Names

| Hook Name | Purpose |
|-----------|---------|
| `install-deps` | Install dependencies |
| `update-deps` | Update dependencies |
| `clean-deps` | Clean dependency directories |
| `build` | Build the project |
| `test` | Run tests |
| `test-unit` | Run unit tests |
| `test-integration` | Run integration tests |
| `lint` | Run linter |
| `lint-fix` | Run linter with auto-fix |
| `db-migrate` | Run database migrations |
| `db-seed` | Seed database |
| `db-reset` | Reset database |

---

## Git/VCS Operations

### Git Status

Check git status across all projects:

```bash
# Check all projects
climb git status

# Check specific projects
climb git status api frontend

# Interactive selection
climb git --interactive status
```

### Git Pull

Pull changes safely:

```bash
# Pull all projects
climb git pull

# Pull with rebase
climb git pull --rebase

# Force pull (stashes changes)
climb git pull --force
```

**Safety Features:**
- Won't pull with uncommitted changes
- Won't pull if merge would occur
- Clear warnings and suggestions
- Use `--force` to override (stashes changes)

### Git Sync

Fetch and pull changes safely:

```bash
# Sync all projects
climb git sync

# Sync in parallel
climb git sync --parallel

# Sync specific projects
climb git sync api frontend
```

**How it works:**
1. Fetches latest remote information
2. Checks for uncommitted changes
3. Only pulls if fast-forward possible
4. Skips projects with local commits
5. Provides clear status for each project

### Git Root

Find repository root:

```bash
# Show git root for all projects
climb git root

# Show for specific projects
climb git root api

# List all repositories
climb git --list
```

---

## Web Dashboard

### Starting the Dashboard

```bash
# Start with defaults (port 3001)
climb server

# Custom port
climb server --port 8080

# Allow external access
climb server --host 0.0.0.0

# Don't auto-open browser
climb server --no-open
```

### Features

- 📊 Real-time project status
- ▶️ One-click start/stop/restart
- 🔄 Live WebSocket updates
- 🎨 Beautiful modern UI
- 📱 Responsive design
- 💻 Container information
- 🏷️ Workspace support

### Architecture

```
packages/
├── core/                    # CLI tool
│   └── bin/server.js       # Server launcher
├── server/                  # API Server
│   ├── src/api/            # REST endpoints
│   ├── src/websocket.js    # WebSocket handlers
│   └── src/index.js        # Server entry
└── web/                     # React Dashboard
    ├── src/App.jsx         # Main component
    └── dist/               # Built files
```

### Development Mode

```bash
# Terminal 1 - Server
cd packages/server
yarn dev

# Terminal 2 - Web (hot reload)
cd packages/web
yarn dev
```

### Production Build

```bash
# Build web dashboard
yarn workspace @climber/web build

# Start server (serves built files)
climb server
```

---

## API Reference

### REST Endpoints

#### Projects
- `GET /api/projects` - List all projects with status
- `GET /api/projects/:name` - Get specific project
- `POST /api/projects/:name/start` - Start project
- `POST /api/projects/:name/stop` - Stop project
- `POST /api/projects/:name/restart` - Restart project
- `POST /api/projects/bulk/start` - Start multiple projects
- `POST /api/projects/bulk/stop` - Stop multiple projects

#### Hooks
- `GET /api/hooks` - List available hooks
- `POST /api/hooks/execute` - Execute hook

#### Git
- `GET /api/git/status` - Git status for all projects
- `POST /api/git/pull` - Pull changes
- `POST /api/git/sync` - Sync with remote

#### Workspaces
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/current` - Current workspace
- `POST /api/workspaces/switch` - Switch workspace

#### Logs
- `GET /api/logs/:project` - Get project logs

#### Health
- `GET /api/health` - Health check

### WebSocket Events

#### Client → Server
- `subscribe:projects` - Subscribe to project updates
- `subscribe:logs` - Subscribe to log updates

#### Server → Client
- `connected` - Connection established
- `projects:status` - Project status update
- `logs:data` - Log data
- `error` - Error message

---

## Configuration

### Workspace Configuration

Configuration file: `~/.climber-config/workspaces/{workspace-name}.yaml`

```yaml
# Workspace metadata
workspace:
  name: development
  description: Development environment

# Project definitions
projects:
  - name: api
    path: ./backend/api
    description: Ruby on Rails API
    docker-compose: docker-compose.yml
    env: development
    dependencies: [database]
    hooks:
      install-deps:
        command: bundle install
      test:
        command: bundle exec rspec

  - name: frontend
    path: ./web/frontend
    description: React frontend
    docker-compose: docker-compose.yml
    dependencies: [api]
    hooks:
      install-deps:
        command: npm install
      test:
        command: npm test

  - name: database
    path: ./infrastructure/database
    description: PostgreSQL database
    docker-compose: docker-compose.yml

# Project groups
groups:
  backend: [api, database]
  frontend: [frontend]
  all: [api, frontend, database]

# Global hooks
hooks:
  clean-deps:
    command: rm -rf node_modules vendor __pycache__
    description: Clean dependency directories

# Custom commands
customCommands:
  bundle-update:
    command: bundle update
    description: Update Ruby gems
    target: backend

# Environments
environments:
  development:
    RAILS_ENV: development
    NODE_ENV: development
  production:
    RAILS_ENV: production
    NODE_ENV: production
```

### Environment Variables

Server configuration (`.env` in `packages/server/`):

```env
PORT=3001
HOST=localhost
OPEN_BROWSER=true
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
```

Workspace selection:

```bash
# Use specific workspace for single command
CLIMBER_WORKSPACE=production climb ps

# Export for session
export CLIMBER_WORKSPACE=production
climb ps
```

---

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run tests for specific package
yarn test:core
yarn test:server
yarn test:web

# Run with coverage
yarn workspace @climber/core test:coverage

# Watch mode
yarn workspace @climber/core test:watch
```

### Test Structure

```
packages/
├── core/__tests__/
│   ├── core.test.js
│   ├── hooks.test.js
│   ├── vcs.test.js
│   ├── workspace.test.js
│   └── ...
├── server/__tests__/
│   ├── api/
│   │   ├── projects.test.js
│   │   ├── hooks.test.js
│   │   └── git.test.js
│   └── websocket.test.js
└── web/src/
    └── App.test.jsx
```

### Coverage Requirements

- Core: 35-45% (CLI tool nature)
- Server: 70%+
- Web: 70%+

---

## Contributing

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/climber.git
   cd climber
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make Changes**
   - Make changes in appropriate package
   - Write tests
   - Update documentation

5. **Run Tests**
   ```bash
   yarn test
   yarn lint
   ```

6. **Commit Changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

7. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Write meaningful commit messages
- Add tests for new features

### Package Structure

```
packages/
├── core/              # CLI tool (standalone)
├── server/            # API server (uses core)
├── web/               # Web dashboard (uses server)
└── desktop/           # Desktop app (future)
```

### Making Changes to Core

```bash
cd packages/core
# Make changes...
yarn test
```

Changes are immediately available to other packages via workspace linking.

### Testing Integration

```bash
# Terminal 1: Server
cd packages/server
yarn dev

# Terminal 2: Web
cd packages/web
yarn dev

# Terminal 3: Test CLI
cd packages/core
yarn dev up
```

---

## Examples

### Example 1: Multi-Project Workflow

```bash
# Initialize workspace
climb init

# Check status
climb ps

# Start infrastructure
climb up database redis

# Start application
climb up api worker

# View logs
climb logs --follow

# Stop everything
climb down
```

### Example 2: Using Hooks

```yaml
# config.yaml
projects:
  - name: api
    hooks:
      install-deps:
        command: bundle install
      test:
        command: bundle exec rspec

  - name: frontend
    hooks:
      install-deps:
        command: npm install
      test:
        command: npm test
```

```bash
# Install all dependencies
climb hooks install-deps

# Run all tests in parallel
climb hooks test --parallel
```

### Example 3: Git Workflow

```bash
# Check status of all projects
climb git status

# Sync all projects safely
climb git sync

# Pull specific projects with rebase
climb git pull api frontend --rebase
```

### Example 4: Custom Commands

```yaml
# config.yaml
customCommands:
  db-reset:
    command: "bundle exec rake db:drop db:create db:migrate db:seed"
    description: Reset database
    target: api

  lint-all:
    command: "npm run lint"
    description: Lint all frontend projects
    target: frontend
    parallel: true
```

```bash
# Run custom commands
climb run db-reset
climb run lint-all
```

### Example 5: Web Dashboard

```bash
# Start dashboard
climb server

# Access at http://localhost:3001
# - View all projects
# - Start/stop projects with one click
# - See real-time status updates
```

---

## Troubleshooting

### Common Issues

#### Configuration Not Found

**Problem:** `Configuration file not found`

**Solution:**
```bash
climb init
```

#### Docker Compose Not Found

**Problem:** `docker-compose command not found`

**Solution:**
Install Docker Desktop or Docker Compose

#### Port Already in Use

**Problem:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Use different port
climb server --port 3002
```

#### Hook Not Found

**Problem:** `No hook defined for 'install-deps'`

**Solution:**
Add hook to project configuration:
```yaml
projects:
  - name: api
    hooks:
      install-deps:
        command: npm install
```

#### Git Pull Fails

**Problem:** `Cannot pull: uncommitted changes`

**Solution:**
```bash
# Commit changes
git commit -am "WIP"
climb git pull

# Or force pull (stashes)
climb git pull --force
```

### Getting Help

```bash
# General help
climb --help

# Command-specific help
climb up --help
climb hooks --help
climb git --help
climb server --help
```

---

## Best Practices

### 1. Use Standard Hook Names
Stick to standard names like `install-deps`, `test`, `lint` for consistency.

### 2. Project Groups
Organize related projects into groups:
```yaml
groups:
  backend: [api, worker, scheduler]
  frontend: [web, admin, mobile]
```

### 3. Service Dependencies
Define dependencies for proper startup order:
```yaml
projects:
  - name: api
    dependencies: [database, redis]
```

### 4. Git Safety
Use `climb git sync` instead of `climb git pull` for safer operations.

### 5. Parallel Execution
Use `--parallel` for independent operations:
```bash
climb hooks install-deps --parallel
climb git status --parallel
```

### 6. Interactive Mode
When unsure, use interactive mode:
```bash
climb hooks --interactive
climb git --interactive status
```

---

## FAQ

### Q: Can I use multiple workspaces?
**A:** Yes! Use `climb workspace create` to create new workspaces and `climb workspace switch` to switch between them.

### Q: How do I add a new project?
**A:** Edit your workspace configuration file or run `climb init` to use the interactive setup.

### Q: Can I run commands in parallel?
**A:** Yes! Use the `--parallel` flag with hooks and git commands.

### Q: Does the web dashboard work remotely?
**A:** Yes, but you need to start the server with `--host 0.0.0.0` and ensure proper firewall/security settings.

### Q: How do I backup my configuration?
**A:** Configuration files are in `~/.climber-config/`. Back up this directory.

### Q: Can I use with Podman instead of Docker?
**A:** Podman with docker-compose compatibility should work, but it's not officially tested.

---

## Resources

- [Main README](./README.md)
- [Core Package](./packages/core/README.md)
- [Server Package](./packages/server/README.md)
- [Web Package](./packages/web/README.md)
- [GitHub Repository](https://github.com/tavantzo/climber)

---

**Version:** 2.3.0  
**Last Updated:** October 4, 2025  
**License:** MIT

