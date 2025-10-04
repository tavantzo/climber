# Changelog

All notable changes to Mountain Climber will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Desktop application with Electron
- Log streaming in web UI
- Git operations in web UI
- Hook execution in web UI
- Resource usage graphs
- Authentication system

## [2.3.0] - 2025-10-04

### Added
- **Web Dashboard**: Beautiful React-based GUI for managing Docker projects
  - Real-time project status with WebSocket updates
  - One-click start/stop/restart controls
  - Responsive modern UI with dark theme
  - Container information display
  - Auto-refresh capability
- **Server Package** (`@climber/server`): REST API with WebSocket support
  - Express.js REST API for all core operations
  - Socket.IO for real-time updates
  - Comprehensive API endpoints for projects, hooks, git, workspaces, and logs
  - Health check endpoint
- **`climb server` Command**: Start web dashboard with CLI
  - Auto-opens browser
  - Configurable port and host
  - Serves built web application
- **Monorepo Structure**: Migrated to Yarn Workspaces
  - `@climber/core` - CLI tool
  - `@climber/server` - API server
  - `@climber/web` - Web dashboard
- **Comprehensive Test Suite**: Added tests for all packages
  - 235+ tests for core package
  - 50+ tests for server package  
  - 30+ tests for web package
  - Coverage reporting with Codecov
- **Updated CI/CD**: Enhanced GitHub Actions workflows
  - Separate jobs for each package
  - Coverage tracking per package
  - Web build verification
  - Cross-platform testing

### Changed
- Migrated from single package to monorepo structure
- Updated all workflows to support monorepo
- Enhanced documentation with web dashboard guides

### Technical Improvements
- React 18 with Vite for web dashboard
- Socket.IO for real-time updates
- Axios for API calls
- Modern CSS with animations and glassmorphism
- Jest for core and server testing
- Vitest with React Testing Library for web testing
- Yarn Workspaces for monorepo management
- Express.js middleware for compression and security
- WebSocket event system for real-time communication

### Documentation
- Created comprehensive DOCUMENTATION.md with all features
- Consolidated CHANGELOG.md with version history
- Updated README.md with web dashboard instructions
- Added API reference documentation
- Removed 24 temporary documentation files

## [2.2.0] - 2024-01-XX

### Added
- **Command Hooks System**: Standardized commands across different project types
  - Project-specific hook definitions
  - Global hook support
  - Standard hook names (install-deps, test, lint, etc.)
  - Parallel and sequential execution
  - Interactive hook selection
- **Git/VCS Operations**: Built-in Git operations
  - `climb git status` - Check git status across projects
  - `climb git pull` - Safely pull changes
  - `climb git sync` - Fetch and pull with safety checks
  - `climb git root` - Find repository roots
  - Safety features to prevent conflicts
- **`climb hooks` Command**: Execute hooks across projects
- **`climb git` Command**: Git operations for multiple projects
- **Enhanced Custom Commands**: Environment variable substitution
  - `${PROJECT_NAME}` and `${PROJECT_PATH}` support
- **Comprehensive Test Suite**: 235 tests across 14 test suites
- **GitHub Actions CI/CD**: Multiple workflows for testing and releases

### Technical Improvements
- New `bin/hooks.js` module for hook management
- New `bin/vcs.js` module for Git operations
- New `bin/git.js` CLI command
- New `bin/hooks-cli.js` CLI command
- Enhanced error handling and validation
- Test coverage: 47.66% statements (realistic for CLI tool)

## [2.1.0] - 2024-01-XX

### Added
- **Multi-Workspace Support**: Create and manage multiple workspaces
  - `climb workspace create` - Create new workspace
  - `climb workspace list` - List all workspaces
  - `climb workspace switch` - Switch between workspaces
  - `climb workspace delete` - Delete workspace
- **Workspace Isolation**: Each workspace has its own configuration
- **Environment Variable Support**: `CLIMBER_WORKSPACE` for single commands
- **Automatic Migration**: Seamless migration from single-config to multi-workspace
- **Workspace Registry**: Central tracking of all workspaces

### Changed
- **BREAKING**: Configuration structure changed to support multiple workspaces
- Configuration files now in `~/.climber-config/workspaces/` directory
- All commands now work with current workspace context

### Migration
- Existing configurations automatically migrated to workspace format
- Old files backed up
- Default workspace created from existing configuration

## [2.0.0] - 2024-01-XX

### Added
- **YAML Configuration Format**: Better readability
- **Environment Management**: Multiple environments (dev, staging, prod)
- **Service Dependencies**: Automatic topological sorting
- **Enhanced Init Wizard**: Interactive setup
- **Project Descriptions**: Better organization
- **Startup Order Control**: Dependencies respected

### Changed
- **BREAKING**: Configuration format changed from JSON to YAML
- **BREAKING**: Configuration structure redesigned
- Enhanced UI with progress indicators

### Migration
- Automatic migration from JSON to YAML
- Old files backed up
- Run `climb init` to set up new format

## [1.2.0] - 2024-01-XX

### Added
- `climb logs` command with follow and tail support
- `climb restart` command with timeout support
- `climb clean` command for Docker resource cleanup
- Comprehensive error handling
- ESLint configuration
- Jest testing framework
- GitHub Actions CI/CD

### Changed
- Improved error handling across all commands
- Updated dependencies
- Enhanced documentation

### Fixed
- JavaScript linting errors
- Markdown formatting issues
- Configuration validation

## [1.1.0] - Initial Release

### Features
- Basic Docker Compose management (`up`, `down`, `ps`)
- Configuration initialization with auto-discovery
- Multiple project management
- Simple JSON configuration

---

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md).

