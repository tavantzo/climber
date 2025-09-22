# Mountain Climber 🏔️

A powerful command line tool to handle simultaneously multiple dockerized services that are orchestrated using docker-compose. Manage multiple workspaces, environments, and service dependencies with ease.

[![CI](https://github.com/tavantzo/climber/workflows/CI/badge.svg)](https://github.com/tavantzo/climber/actions)
[![Test Coverage](https://codecov.io/gh/tavantzo/climber/branch/main/graph/badge.svg)](https://codecov.io/gh/tavantzo/climber)
[![npm version](https://badge.fury.io/js/mountain-climber.svg)](https://badge.fury.io/js/mountain-climber)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Getting Started

### Installation

```bash
npm install -g mountain-climber
```

or

```bash
yarn global add mountain-climber
```

### Quick Start

**1. Create a workspace (recommended):**
```bash
climb workspace create my-project "My awesome project"
```

**2. Initialize your configuration:**
```bash
climb init
```

The initialization wizard will guide you through setting up your configuration with **interactive tab completion** and **filesystem support**:

1. **Root Directory**: Enter the root directory containing your projects
   - **Tab completion** for directory navigation
   - **`~` support** for home directory shortcuts
   - **Relative path** support with `../` navigation
2. **Project Discovery**: Choose between auto-discovery or manual project entry
3. **Project Details**: For each project, specify:
   - Project name
   - Relative path from root directory
   - Description (optional)
4. **Environments**: Configure different environments (development, staging, production)
5. **Dependencies**: Set up service dependencies and startup order

**Example Configuration:**
```yaml
root: /Users/developer/my-services
projects:
  - name: database
    path: database
    description: PostgreSQL database service
  - name: api
    path: backend/api
    description: REST API service
  - name: frontend
    path: frontend
    description: React frontend application
environments:
  default:
    description: Default environment
    projects: [database, api, frontend]
  development:
    description: Development environment
    projects: [database, api]
  production:
    description: Production environment
    projects: [database, api, frontend]
dependencies:
  api: [database]
  frontend: [api]
```

**Auto-discovery mode** automatically finds docker-compose files under the declared root directory. Just follow the wizard!

**3. Start your services:**
```bash
climb up
```

Now the tool is ready to use! 🚀

## Commands

### Core Commands
- `climb up`: Build, recreate and start all services. Removes orphan containers.
- `climb down`: Stop all services.
- `climb ps`: Show services status.
- `climb logs`: View logs from all services with follow mode support.
- `climb restart`: Restart all or specific services.
- `climb clean`: Clean up unused Docker resources.

### Configuration & Workspace Management
- `climb config`: Show current configuration and environment status.
- `climb workspace`: Manage workspaces (create, list, switch, delete).
- `climb init`: Interactive configuration setup with tab completion.

### Utility Commands
- `climb help`: Show help text
- `climb version`: Show current version

### Command Details

#### `climb logs` (or `climb l`)
View logs from all configured services.

**Options:**
- `--follow` or `-f`: Follow log output (like `tail -f`)
- `--tail=N`: Number of lines to show from the end of logs (default: 100)
- `[service]`: Optional service name to filter logs

**Examples:**
```bash
climb logs                    # Show last 100 lines from all services
climb logs --follow          # Follow logs from all services
climb logs --tail=50         # Show last 50 lines
climb logs web               # Show logs only from 'web' service
climb logs --follow web      # Follow logs from 'web' service
```

#### `climb restart` (or `climb r`)
Restart all services or specific services across all projects.

**Options:**
- `--timeout=N`: Timeout in seconds for restart (default: 10)
- `[service]`: Optional service name to restart

**Examples:**
```bash
climb restart                # Restart all services
climb restart web            # Restart 'web' service in all projects
climb restart --timeout=30   # Restart with 30-second timeout
```

#### `climb clean`
Clean up unused Docker resources to free disk space.

**Options:**
- `--force` or `-f`: Force removal without confirmation
- `--volumes` or `-v`: Also remove unused volumes
- `--images` or `-i`: Also remove unused images
- `--networks` or `-n`: Also remove unused networks
- `--all` or `-a`: Remove all unused resources (equivalent to all flags above)

**Examples:**
```bash
climb clean                  # Basic cleanup (containers and networks)
climb clean --volumes        # Also remove unused volumes
climb clean --images         # Also remove unused images
climb clean --all            # Remove all unused resources
climb clean --all --force    # Force removal without confirmation
```

#### `climb config`
Show current configuration and environment status.

**Examples:**
```bash
climb config                 # Show current configuration
CLIMBER_ENV=development climb config  # Show configuration for specific environment
```

#### `climb workspace`
Manage workspaces for organizing different projects.

**Subcommands:**
- `list`, `ls`: List all workspaces
- `create <name> [description]`: Create a new workspace
- `delete <name>`: Delete a workspace
- `switch <name>`: Switch to a workspace
- `current`: Show current workspace
- `info <name>`: Show workspace information

**Examples:**
```bash
climb workspace list                    # List all workspaces
climb workspace create my-project       # Create a new workspace
climb workspace create my-project "My awesome project"  # With description
climb workspace switch my-project       # Switch to a workspace
climb workspace current                 # Show current workspace
climb workspace info my-project         # Show workspace details
CLIMBER_WORKSPACE=my-project climb up   # Use workspace for single command
```

## Configuration

### Workspace Management

Mountain Climber supports multiple workspaces to organize different projects:

```bash
# Create a new workspace
climb workspace create my-project "My awesome project"

# List all workspaces
climb workspace list

# Switch to a workspace
climb workspace switch my-project

# Use a workspace for a single command
CLIMBER_WORKSPACE=my-project climb up
```

**Workspace Structure:**
```
~/.climber-config/
├── workspaces.yaml          # Workspace registry
└── workspaces/
    ├── default.yaml         # Default workspace config
    ├── my-project.yaml      # My project workspace config
    └── another-project.yaml # Another project workspace config
```

Each workspace has its own:
- Root directory
- Project list
- Environment configurations
- Service dependencies

### Environment Management

Mountain Climber supports multiple environments to manage different sets of services:

```bash
# Use default environment
climb up

# Use specific environment
CLIMBER_ENV=development climb up
CLIMBER_ENV=staging climb up
CLIMBER_ENV=production climb up
```

### Service Dependencies

Configure service dependencies to ensure proper startup order:

```yaml
dependencies:
  api: [database]        # API depends on database
  frontend: [api]        # Frontend depends on API
  worker: [database, api] # Worker depends on both database and API
```

Services will start in dependency order (database → api → frontend → worker) and stop in reverse order.

### Configuration File

The configuration is stored in `~/.climber-config/config.yaml` and supports:

- **YAML format** for better readability
- **Environment-specific** project lists
- **Service dependencies** with automatic topological sorting
- **Project descriptions** for better organization
- **Automatic migration** from old JSON format

### Configuration Examples

**Development Environment:**
```yaml
environments:
  development:
    description: Development environment
    projects: [database, api]  # Only core services
```

**Production Environment:**
```yaml
environments:
  production:
    description: Production environment
    projects: [database, api, frontend, monitoring]  # All services
```

## Development

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn package manager

### Setup
```bash
git clone https://github.com/tavantzo/climber.git
cd climber
npm install
```

### Running Tests
```bash
npm test                    # Run all tests
npm run test:coverage      # Run tests with coverage report
npm run test:watch         # Run tests in watch mode
npm run test:ci            # Run tests for CI environment
```

### Code Quality
```bash
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
```

### Test Coverage
The project includes comprehensive test coverage:
- **186 tests** across 12 test suites
- **47.66%** statement coverage
- **35.98%** branch coverage
- **39.82%** function coverage
- **47.54%** line coverage

### CI/CD Pipeline
The project uses GitHub Actions for:
- **Automated testing** on multiple Node.js versions (14.x, 16.x, 18.x, 20.x)
- **Cross-platform testing** (Ubuntu, Windows, macOS)
- **Code coverage** reporting with Codecov
- **Automated releases** with NPM publishing
- **Linting** and code quality checks

## Features

### 🏗️ **Multi-Workspace Support**
- Create and manage multiple workspaces for different projects
- Isolated configurations per workspace
- Easy switching between workspaces

### 🌍 **Environment Management**
- Support for multiple environments (development, staging, production)
- Environment-specific project configurations
- Easy environment switching with `CLIMBER_ENV`

### 🔗 **Service Dependencies**
- Configure service dependencies with automatic topological sorting
- Proper startup and shutdown order
- Dependency validation

### 📁 **Interactive Setup**
- Tab completion for directory navigation
- Filesystem support with `~` and relative paths
- Auto-discovery of docker-compose files

### 📊 **Comprehensive Logging**
- Follow mode for real-time log monitoring
- Service-specific log filtering
- Concurrent log streaming for multiple projects

### 🧹 **Docker Resource Management**
- Clean up unused containers, volumes, images, and networks
- Force removal options
- Comprehensive cleanup strategies

### 🧪 **Quality Assurance**
- 186 comprehensive tests
- 47%+ code coverage
- ESLint code quality enforcement
- Cross-platform compatibility testing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run the test suite (`npm test`)
5. Run linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## Release Process

Mountain Climber uses automated releases with semantic versioning:

### Creating Releases
```bash
# Create a stable release
./scripts/release.sh stable

# Create a beta release
./scripts/release.sh beta

# Create an alpha release
./scripts/release.sh alpha

# Create a release candidate
./scripts/release.sh rc
```

### Release Types
- **Stable**: Production-ready releases (e.g., `2.1.0`)
- **Beta**: Feature-complete but may have bugs (e.g., `2.1.0-beta.1`)
- **Alpha**: Early development releases (e.g., `2.1.0-alpha.1`)
- **Release Candidate**: Pre-release candidates (e.g., `2.1.0-rc.1`)

### Automated Publishing
- **Stable releases** are automatically published to NPM
- **Pre-releases** are marked as such in GitHub and NPM
- **Changelog** is automatically generated from commit history
- **GitHub Releases** are created with detailed release notes

For more information, see [RELEASE.md](RELEASE.md).

## License

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.

## Acknowledgments

- Built with ❤️ for the Docker community
- Inspired by the need for better multi-service development workflows
- Thanks to all contributors and users for feedback and improvements
