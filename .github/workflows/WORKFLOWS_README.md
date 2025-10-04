# GitHub Workflows Documentation

## Overview

Mountain Climber uses GitHub Actions for CI/CD with workflows optimized for the monorepo structure.

---

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger:** Push to `main`/`develop`, Pull Requests to `main`

**Jobs:**
- `test-core` - Tests Core package on Node.js 18.x & 20.x
- `test-server` - Tests Server package on Node.js 18.x & 20.x
- `test-web` - Builds and verifies Web package on Node.js 18.x & 20.x
- `integration` - Runs integration tests + builds web dashboard

**Coverage:** Uploads to Codecov with separate flags:
- `core` - Core package coverage
- `server` - Server package coverage

**Web Build Verification:**
- Builds React dashboard with Vite
- Verifies build output exists
- Tests `climb server` command
- Checks CLI help includes server command

---

### 2. Test Suite (`test.yml`)

**Trigger:** Push/PR to `main`/`develop`

**Jobs:**
- `test` - Runs all package tests on Node.js 18.x & 20.x
- `test-core-ci` - Core package CI tests (push only)
- `test-server-ci` - Server package CI tests (push only)

**Features:**
- Matrix testing across Node versions
- Coverage reports for both packages
- Lint checks for all packages

---

### 3. Test Matrix (`test-matrix.yml`)

**Trigger:** Push/PR to `main`/`develop`

**Jobs:**
- `test-matrix` - Cross-platform testing

**Matrix:**
- OS: Ubuntu, Windows, macOS
- Node.js: 18.x, 20.x

**Tests:**
- Lint all packages
- Run all tests
- Coverage on Ubuntu + Node 20.x
- CLI command verification
- Web build verification

---

### 4. Quick Test (`test-quick.yml`)

**Trigger:** Pull Requests

**Purpose:** Fast feedback for PRs

**Tests:**
- Core package tests
- Server package tests
- Basic linting

---

### 5. Release Workflows

**Files:**
- `release.yml` - Create releases
- `create-release.yml` - Automated release creation
- `mark-stable.yml` - Mark releases as stable
- `test-release.yml` - Test release process

---

## Monorepo Structure

```
climber/
├── packages/
│   ├── core/          # CLI tool (@climber/core)
│   ├── server/        # API server (@climber/server)
│   └── web/           # Web dashboard (@climber/web)
├── .github/
│   └── workflows/     # CI/CD workflows
└── package.json       # Root workspace config
```

---

## Workspace Commands

### Run Tests

```bash
# All packages
yarn test

# Specific package
yarn workspace @climber/core test
yarn workspace @climber/server test

# With coverage
yarn workspace @climber/core test:coverage
yarn workspace @climber/server test:coverage
```

### Run Linter

```bash
# All packages
yarn lint

# Specific package
yarn workspace @climber/core lint
yarn workspace @climber/server lint
yarn workspace @climber/web lint
```

### Build

```bash
# All packages
yarn build

# Specific package
yarn workspace @climber/web build
```

---

## Corepack Setup

All workflows enable Corepack for Yarn support:

```yaml
- name: Enable Corepack
  run: corepack enable
```

This ensures Yarn is available in CI environments.

---

## Coverage Reports

### Codecov Flags

- `core` - Core package coverage
- `server` - Server package coverage

### Upload Example

```yaml
- name: Upload Core Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./packages/core/coverage/lcov.info
    flags: core
    name: core-coverage
```

### Viewing Coverage

Coverage reports are available at:
- Codecov dashboard
- PR comments (automatic)
- Workflow artifacts

---

## Best Practices

### 1. Frozen Lockfile

Always use `--frozen-lockfile` in CI:

```yaml
- name: Install dependencies
  run: yarn install --frozen-lockfile
```

### 2. Matrix Testing

Test on multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
```

### 3. Conditional Steps

Only run on specific conditions:

```yaml
- name: Upload coverage
  if: matrix.node-version == '20.x'
  run: yarn test:coverage
```

### 4. Job Dependencies

Chain jobs with `needs`:

```yaml
integration:
  needs: [test-core, test-server, test-web]
```

---

## Troubleshooting

### Yarn Not Found

**Solution:** Ensure Corepack is enabled

```yaml
- name: Enable Corepack
  run: corepack enable
```

### Workspace Dependency Issues

**Error:** `Couldn't find package "@climber/core@workspace:*"`

**Solution:** Use `"*"` instead of `"workspace:*"` for Yarn 1.x

```json
{
  "dependencies": {
    "@climber/core": "*"
  }
}
```

### Coverage Upload Failures

**Solution:** Check file paths match coverage output

```yaml
files: ./packages/core/coverage/lcov.info
```

### Build Failures

**Check:**
1. All dependencies installed
2. Workspace structure correct
3. Package.json scripts exist
4. Node version compatible

---

## Adding New Workflows

### Template

```yaml
name: New Workflow

on:
  push:
    branches: [ main, develop ]

jobs:
  new-job:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'yarn'
    
    - name: Enable Corepack
      run: corepack enable
    
    - name: Install dependencies
      run: yarn install --frozen-lockfile
    
    - name: Run task
      run: yarn workspace @climber/package task
```

---

## Workflow Status Badges

### CI Status

```markdown
![CI](https://github.com/tavantzo/climber/workflows/CI/badge.svg)
```

### Test Suite

```markdown
![Tests](https://github.com/tavantzo/climber/workflows/Test%20Suite/badge.svg)
```

### Coverage

```markdown
[![codecov](https://codecov.io/gh/tavantzo/climber/branch/main/graph/badge.svg)](https://codecov.io/gh/tavantzo/climber)
```

---

## Performance

### Typical Run Times

| Workflow | Duration | Notes |
|----------|----------|-------|
| CI | ~5-7 min | All packages, multiple jobs |
| Test Suite | ~4-6 min | All packages, matrix |
| Test Matrix | ~15-20 min | Cross-platform |
| Quick Test | ~2-3 min | Fast PR feedback |

### Optimization Tips

1. **Cache Dependencies**
   ```yaml
   cache: 'yarn'
   ```

2. **Run Jobs in Parallel**
   ```yaml
   jobs:
     test-core: ...
     test-server: ...
     test-web: ...
   ```

3. **Skip Redundant Steps**
   ```yaml
   if: matrix.node-version == '20.x'
   ```

---

## Security

### Secrets

No secrets required for standard workflows.

### Permissions

Default permissions are sufficient:
- Read repository
- Write checks
- Comment on PRs

---

## Maintenance

### Updating Node Versions

Update matrix in all workflows:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Add new version
```

### Updating Actions

Keep actions up to date:

```yaml
- uses: actions/checkout@v4  # Latest
- uses: actions/setup-node@v4  # Latest
- uses: codecov/codecov-action@v3  # Latest
```

---

## Support

For workflow issues:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Test locally with same Node version
4. Check package.json scripts

---

**Last Updated:** October 4, 2025  
**Monorepo Version:** 2.3.0

