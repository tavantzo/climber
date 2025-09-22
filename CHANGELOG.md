# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2024-01-XX

### Added
- Future features and improvements will be documented here

## [2.2.0] - 2024-01-XX

### Added
- **Custom Commands System**: Execute project-specific commands across multiple projects
  - Project groups for organizing related projects (e.g., `ruby-projects`, `frontend-projects`)
  - Flexible targeting: run commands on specific projects, groups, or all projects
  - Parallel and sequential execution modes
  - Interactive and non-interactive command execution
  - Command-line and interactive target selection
  - Perfect for `bundle exec`, `npm run`, `yarn`, `git` operations, etc.
- **Enhanced Help System**: Custom commands displayed in main help menu
  - Automatic detection and display of configured custom commands
  - Command names, descriptions, and default targets shown
  - Graceful handling of missing configurations
  - Consistent help experience across all commands
- **Dependency Readiness Checking**: Health checks for service dependencies
  - HTTP health checks for web services
  - Port availability checks for database services
  - Custom command execution for complex checks
  - Docker service status verification
  - Configurable retry logic with customizable timeouts
  - Integration with service startup process
- **Enhanced Project Selection**: Improved targeting for all core commands
  - Command-line project selection for targeted operations
  - Interactive checkbox menus for easy project selection
  - Mix and match command-line and interactive selection
  - All projects selected by default in interactive mode
- **Comprehensive Test Suite**: 235 tests across 14 test suites covering all major functionality
- **Code Coverage Reporting**: Jest coverage with realistic thresholds (35-45% based on CLI tool nature)
- **GitHub Actions CI/CD**: 9 workflow files for testing, coverage, cross-platform compatibility, and releases
- **Release Management System**: Complete automated release pipeline with NPM publishing
- **Release Script**: `scripts/release.sh` for command-line release management
- **Cross-Platform Testing**: Ubuntu, Windows, and macOS compatibility testing
- **Node.js Version Matrix**: Testing on Node.js 14.x, 16.x, 18.x, and 20.x
- **ESLint Integration**: Code quality enforcement with automated linting
- **Interactive Tab Completion**: Advanced directory browsing with `~` and relative path support
- **Release Documentation**: Comprehensive `RELEASE.md` with examples and best practices
- **Test Documentation**: Detailed test coverage and CI/CD pipeline documentation

### Technical Improvements
- **Test Coverage**: 47.66% statements, 35.98% branches, 39.82% functions, 47.54% lines (235 tests)
- **Custom Commands Module**: New `bin/custom-commands.js` with comprehensive functionality
- **Run Command**: New `bin/run.js` CLI command for executing custom commands
- **Enhanced Init Process**: Custom commands configuration during setup
- **CI/CD Pipeline**: Multiple workflows for different scenarios (quick tests, full matrix, releases)
- **NPM Publishing**: Automated publishing for stable releases with proper versioning
- **GitHub Releases**: Automatic release creation with changelog generation and pre-release marking
- **Error Handling**: Comprehensive error handling and validation across all modules
- **Code Quality**: ESLint enforcement and automated code formatting
- **Package Management**: Consistent yarn usage across all workflows and scripts
- **Release Automation**: Support for stable, beta, alpha, and release candidate versions

### New Commands and Files
- **`climb run`**: Execute custom commands on projects or groups
  - `climb run <command> [targets...] [options]`
  - `climb run --list` to list available custom commands
  - `climb run --help` for detailed help
- **`bin/custom-commands.js`**: Core custom commands functionality
- **`bin/run.js`**: CLI command for executing custom commands
- **`examples/custom-commands-config.yaml`**: Example configuration with custom commands
- **`__tests__/custom-commands.test.js`**: Comprehensive test suite for custom commands

### Workflows Added
- `ci.yml`: Main CI pipeline with testing, linting, and coverage
- `test.yml`: Comprehensive test suite with watch mode and CI mode
- `test-matrix.yml`: Cross-platform testing matrix
- `test-quick.yml`: Fast feedback testing for developers
- `release.yml`: Automated release creation and NPM publishing
- `mark-stable.yml`: Mark existing tags as stable versions
- `create-release.yml`: Manual release creation from GitHub UI
- `test-release.yml`: Release process testing and validation

### Documentation
- **RELEASE.md**: Complete release process documentation
- **Updated README.md**: Enhanced with new features and examples
- **Test Documentation**: Comprehensive test suite documentation
- **CI/CD Documentation**: GitHub Actions workflow documentation

## [2.1.0] - 2024-01-XX

### Added
- **Multi-Workspace Support**: Create and manage multiple workspaces for different projects
- **Workspace Management Commands**: `climb workspace` with subcommands for create, list, switch, delete
- **Workspace Isolation**: Each workspace has its own configuration, projects, and environments
- **Environment Variable Support**: Use `CLIMBER_WORKSPACE` to specify workspace for single commands
- **Automatic Migration**: Seamless migration from single-config to multi-workspace format
- **Workspace Registry**: Central registry tracking all workspaces and current workspace
- **Enhanced Configuration Display**: Show current workspace in config and status commands
- **Comprehensive Test Suite**: 186 tests across 12 test suites with 47% code coverage
- **GitHub Actions CI/CD**: Multiple workflows for testing, coverage, and cross-platform compatibility
- **Release Management System**: Automated release creation, NPM publishing, and stable version marking
- **Release Script**: Command-line tool for creating and managing releases
- **Code Coverage Reporting**: Jest coverage with realistic thresholds and multiple output formats
- **ESLint Configuration**: Code quality enforcement with automated linting
- **Interactive Init Process**: Enhanced setup wizard with tab completion and filesystem support
- **Shell-like Tab Completion**: Advanced directory browsing with `~` and relative path support
- **Release Documentation**: Comprehensive RELEASE.md with examples and best practices

### Changed
- **BREAKING**: Configuration structure changed to support multiple workspaces
- Configuration files now stored in `~/.climber-config/workspaces/` directory
- Each workspace has its own YAML configuration file
- All commands now work with the current workspace context
- Enhanced error messages with workspace-specific guidance
- **Package Manager**: Switched from Yarn to npm for consistency
- **Test Framework**: Comprehensive Jest setup with coverage reporting
- **CI/CD Pipeline**: Multiple GitHub Actions workflows for different scenarios
- **Release Process**: Automated release creation with semantic versioning support

### Technical Improvements
- **Test Coverage**: 47.66% statements, 35.98% branches, 39.82% functions, 47.54% lines
- **Cross-Platform Testing**: Ubuntu, Windows, and macOS compatibility
- **Node.js Support**: Testing on versions 14.x, 16.x, 18.x, and 20.x
- **NPM Publishing**: Automated publishing for stable releases only
- **GitHub Releases**: Automatic release creation with changelog generation
- **Error Handling**: Comprehensive error handling and validation across all modules
- **Code Quality**: ESLint enforcement and automated code formatting

### Migration
- Existing configurations are automatically migrated to workspace format
- Old configuration files are backed up
- Default workspace is created from existing configuration

## [2.0.0] - 2024-01-XX

### Added
- **YAML Configuration Format**: Support for YAML configuration files with better readability
- **Environment Management**: Support for multiple environments (development, staging, production)
- **Service Dependencies**: Configure service dependencies with automatic topological sorting
- **Enhanced Init Wizard**: Interactive setup for projects, environments, and dependencies
- **Automatic Migration**: Seamless migration from old JSON configuration format
- **Project Descriptions**: Add descriptions to projects for better organization
- **Startup Order Control**: Services start in dependency order and stop in reverse order
- **Environment Variables**: Use `CLIMBER_ENV` to switch between environments
- **Enhanced Error Handling**: Better error messages and validation for configuration

### Changed
- **BREAKING**: Configuration format changed from JSON to YAML
- **BREAKING**: Configuration structure completely redesigned for better organization
- All commands now respect service dependencies and startup order
- Enhanced user interface with progress indicators and better feedback
- Improved command output with project descriptions and environment information

### Migration
- Existing JSON configurations are automatically migrated to YAML format
- Old configuration files are backed up as `.backup` files
- Run `climb init` to set up the new configuration format

## [1.2.0] - 2024-01-XX

### Added
- `climb logs` command to view logs from all services
  - Support for `--follow` flag to follow log output
  - Support for `--tail=N` to specify number of lines
  - Support for filtering logs by service name
- `climb restart` command to restart all or specific services
  - Support for `--timeout=N` to specify restart timeout
  - Support for restarting specific services by name
- `climb clean` command to clean up unused Docker resources
  - Support for `--volumes` flag to remove unused volumes
  - Support for `--images` flag to remove unused images
  - Support for `--networks` flag to remove unused networks
  - Support for `--all` flag to remove all unused resources
  - Support for `--force` flag to skip confirmation prompts
- Comprehensive error handling across all commands
- ESLint configuration for code quality
- Jest testing framework with unit tests
- GitHub Actions CI/CD pipeline
- Enhanced documentation with detailed command examples

### Changed
- Improved error handling and user feedback across all existing commands
- Updated dependencies to latest compatible versions
- Enhanced README with better formatting and examples

### Fixed
- Fixed JavaScript linting errors in `up.js`
- Fixed markdown formatting issues in README
- Improved configuration file validation

## [1.1.1] - Previous Version

### Features
- Basic Docker Compose management commands (`up`, `down`, `ps`)
- Configuration initialization with auto-discovery
- Support for multiple project management
