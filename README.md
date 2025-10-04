# Mountain Climber Monorepo 🏔️

[![CI](https://github.com/tavantzo/climber/workflows/CI/badge.svg)](https://github.com/tavantzo/climber/actions/workflows/ci.yml)
[![Test Suite](https://github.com/tavantzo/climber/workflows/Test%20Suite/badge.svg)](https://github.com/tavantzo/climber/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/tavantzo/climber/branch/main/graph/badge.svg)](https://codecov.io/gh/tavantzo/climber)

Multi-project Docker orchestration tool with CLI, Web Dashboard, and Desktop App.

## 📦 Packages

This monorepo contains multiple packages:

### [@climber/core](./packages/core)
The core CLI tool for managing Docker Compose projects.

```bash
npm install -g @climber/core
climb --help
```

### [@climber/server](./packages/server)
REST API server with WebSocket support for the GUI.

```bash
cd packages/server
yarn install
yarn dev
```

### [@climber/web](./packages/web)
React-based web dashboard for managing Docker projects visually.

```bash
# Start the web dashboard
climb server

# Or with custom options
climb server --port 8080
```

**Features:**
- 📊 Real-time project status
- ▶️ One-click start/stop/restart
- 🔄 Live WebSocket updates
- 🎨 Beautiful modern UI
- 📱 Responsive design

### [@climber/desktop](./packages/desktop)
Electron desktop application (Coming soon).

---

## 🚀 Quick Start

### Install Dependencies

```bash
# Install all workspace dependencies
yarn install
```

### Development

```bash
# Run core CLI
yarn dev:core

# Run API server
yarn dev:server

# Run web dashboard
yarn dev:web

# Run server + web together
yarn dev
```

### Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
yarn test:core
yarn test:server
```

### Building

```bash
# Build all packages
yarn build

# Build web dashboard only
yarn workspace @climber/web build
```

### 🌐 Web Dashboard

Start the beautiful web GUI to manage your projects visually:

```bash
# Start the dashboard
climb server
```

Then open http://localhost:3001 in your browser! 🎉

**Quick options:**
```bash
climb server --port 8080        # Custom port
climb server --host 0.0.0.0     # Allow external access
climb server --no-open          # Don't auto-open browser
```

---

## 📁 Project Structure

```
climber/
├── packages/
│   ├── core/              # CLI tool (@climber/core)
│   │   ├── bin/           # CLI commands
│   │   ├── __tests__/     # Tests
│   │   ├── examples/      # Example configs
│   │   └── index.js       # Exported modules
│   │
│   ├── server/            # API server (@climber/server)
│   │   ├── src/
│   │   │   ├── api/       # REST API routes
│   │   │   ├── websocket.js
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── web/               # Web dashboard (@climber/web)
│   │   └── ...
│   │
│   └── desktop/           # Desktop app (@climber/desktop)
│       └── ...
│
├── package.json           # Root workspace config
└── README.md
```

---

## 🔗 Package Dependencies

```
@climber/core (standalone)
     ↓
@climber/server (uses core as library)
     ↓
@climber/web (connects to server)
     ↓
@climber/desktop (wraps web in Electron)
```

---

## 🛠️ Development Workflow

### Making Changes to Core

```bash
cd packages/core
# Make changes...
yarn test
```

Changes are immediately available to other packages via workspace linking.

### Testing Integration

```bash
# Terminal 1: Start server
cd packages/server
yarn dev

# Terminal 2: Start web
cd packages/web
yarn start

# Terminal 3: Test with core CLI
cd packages/core
yarn dev up
```

---

## 📚 Documentation

**[📖 Complete Documentation](./DOCUMENTATION.md)** - Full guide including CLI commands, hooks, Git operations, web dashboard, API reference, and more.

**Package Documentation:**
- [Core CLI](./packages/core/README.md)
- [Server API](./packages/server/README.md)
- [Web Dashboard](./packages/web/README.md)

---

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn workspace @climber/core test:coverage

# Run specific test file
yarn workspace @climber/core test -- hooks.test.js
```

---

## 📦 Publishing

Each package can be published independently:

```bash
# Publish core CLI
cd packages/core
npm version patch
npm publish

# Publish server
cd packages/server
npm version patch
npm publish
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes in the appropriate package
4. Run tests (`yarn test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 License

MIT © Mountain Climber Team

---

## 🙏 Acknowledgments

- Built with ❤️ for the Docker community
- Monorepo powered by Yarn Workspaces

