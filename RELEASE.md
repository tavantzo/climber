# Release Process

This document describes how to create and manage releases for the climber CLI tool.

## Release Types

### Stable Releases
- **Format**: `v1.0.0`
- **Purpose**: Production-ready releases
- **NPM**: Published to NPM registry
- **GitHub**: Marked as stable release

### Beta Releases
- **Format**: `v1.0.0-beta`
- **Purpose**: Testing releases with new features
- **NPM**: Not published to NPM
- **GitHub**: Marked as pre-release

### Alpha Releases
- **Format**: `v1.0.0-alpha`
- **Purpose**: Early testing releases
- **NPM**: Not published to NPM
- **GitHub**: Marked as pre-release

### Release Candidates
- **Format**: `v1.0.0-rc`
- **Purpose**: Final testing before stable release
- **NPM**: Not published to NPM
- **GitHub**: Marked as pre-release

## Creating Releases

### Method 1: Using the Release Script (Recommended)

```bash
# Create a stable release
./scripts/release.sh 1.0.0 stable

# Create a beta release
./scripts/release.sh 1.1.0 beta

# Create an alpha release
./scripts/release.sh 1.2.0 alpha

# Create a release candidate
./scripts/release.sh 1.3.0 rc

# List all tags
./scripts/release.sh list

# Mark existing tag as stable
./scripts/release.sh stable v1.0.0-beta
```

### Method 2: Using GitHub Actions (Manual)

1. Go to the [Actions tab](https://github.com/your-username/climber/actions)
2. Select "Create Release" workflow
3. Click "Run workflow"
4. Fill in the form:
   - **Version**: `1.0.0`
   - **Release Type**: `stable`, `beta`, `alpha`, or `rc`
   - **Changelog**: Optional custom changelog

### Method 3: Using Git Tags (Manual)

```bash
# Update package.json version
npm version 1.0.0 --no-git-tag-version

# Commit the version bump
git add package.json package-lock.json
git commit -m "chore: bump version to v1.0.0"

# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
git push origin HEAD
```

## Marking Tags as Stable

### Method 1: Using the Release Script

```bash
# Mark an existing tag as stable
./scripts/release.sh stable v1.0.0-beta
```

### Method 2: Using GitHub Actions

1. Go to the [Actions tab](https://github.com/your-username/climber/actions)
2. Select "Mark Stable Release" workflow
3. Click "Run workflow"
4. Fill in the form:
   - **Tag**: `v1.0.0-beta`
   - **Create Stable Tag**: `true` (creates `v1.0.0-beta-stable`)

## Release Workflow

When a tag is created, the following happens automatically:

1. **Tests Run**: All tests and linting checks pass
2. **Release Created**: GitHub release is created with changelog
3. **NPM Publishing**: Stable releases are published to NPM
4. **Notifications**: Success/failure notifications are sent

## Release Checklist

Before creating a release:

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is up to date
- [ ] CHANGELOG.md is updated
- [ ] Version number follows semantic versioning
- [ ] Working directory is clean

## Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

## NPM Publishing

Only **stable releases** are published to NPM:

- Stable releases: `v1.0.0` → Published to NPM
- Pre-releases: `v1.0.0-beta` → Not published to NPM

## GitHub Releases

All releases are created on GitHub with:

- **Tag**: The version tag (e.g., `v1.0.0`)
- **Title**: Release name
- **Description**: Auto-generated changelog
- **Assets**: Source code and binaries (if applicable)
- **Pre-release**: Marked based on release type

## Environment Variables

The following secrets must be configured in GitHub:

- `NPM_TOKEN`: NPM authentication token for publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Troubleshooting

### Tag Already Exists
```bash
# Check existing tags
git tag -l

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0
```

### Working Directory Not Clean
```bash
# Check status
git status

# Stash changes
git stash

# Or commit changes
git add .
git commit -m "Your commit message"
```

### NPM Publishing Fails
- Check `NPM_TOKEN` secret is configured
- Verify package name is available on NPM
- Check package.json version matches tag

## Examples

### Creating a Stable Release
```bash
# 1. Create the release
./scripts/release.sh 1.0.0 stable

# 2. Wait for GitHub Actions to complete
# 3. Check NPM: https://www.npmjs.com/package/mountain-climber
# 4. Check GitHub: https://github.com/your-username/climber/releases
```

### Creating a Beta Release
```bash
# 1. Create the beta release
./scripts/release.sh 1.1.0 beta

# 2. Test the beta version
# 3. When ready, mark as stable
./scripts/release.sh stable v1.1.0-beta
```

### Promoting Beta to Stable
```bash
# 1. Mark beta as stable
./scripts/release.sh stable v1.1.0-beta

# 2. This creates v1.1.0-beta-stable tag
# 3. GitHub Actions will publish to NPM
```
