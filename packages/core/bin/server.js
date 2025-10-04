#!/usr/bin/env node

/**
 * climb-server
 * 
 * Start the Mountain Climber web server and dashboard
 */

const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3001;
let host = 'localhost';
let openBrowser = true;

// Parse flags
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--port' || arg === '-p') {
    port = parseInt(args[++i], 10);
  } else if (arg === '--host' || arg === '-h') {
    host = args[++i];
  } else if (arg === '--no-open') {
    openBrowser = false;
  } else if (arg === '--help') {
    showHelp();
    process.exit(0);
  }
}

function showHelp() {
  console.log(`
${chalk.bold('Mountain Climber Server')}

Start the web server and dashboard for managing your Docker projects.

${chalk.bold('Usage:')}
  climb server [options]

${chalk.bold('Options:')}
  -p, --port <port>     Port to run the server on (default: 3001)
  -h, --host <host>     Host to bind to (default: localhost)
  --no-open             Don't open browser automatically
  --help                Show this help message

${chalk.bold('Examples:')}
  climb server                    # Start on default port 3001
  climb server --port 8080        # Start on custom port
  climb server --host 0.0.0.0     # Allow external connections
  climb server --no-open          # Don't open browser

${chalk.bold('Access:')}
  Once started, open http://${host}:${port} in your browser
  `);
}

// Find the server package
const serverPath = path.resolve(__dirname, '../../../server');
const serverIndexPath = path.join(serverPath, 'src', 'index.js');

console.log(chalk.blue('🏔️  Mountain Climber Server'));
console.log(chalk.gray('━'.repeat(50)));
console.log();
console.log(chalk.cyan('Starting server...'));
console.log(chalk.gray(`  Port: ${port}`));
console.log(chalk.gray(`  Host: ${host}`));
console.log(chalk.gray(`  URL:  http://${host}:${port}`));
console.log();

// Set environment variables for the server
const env = {
  ...process.env,
  PORT: port.toString(),
  HOST: host,
  OPEN_BROWSER: openBrowser ? 'true' : 'false'
};

// Start the server
const serverProcess = spawn('node', [serverIndexPath], {
  env,
  stdio: 'inherit',
  cwd: serverPath
});

serverProcess.on('error', (error) => {
  console.error(chalk.red('\n✗ Failed to start server:'), error.message);
  console.log();
  console.log(chalk.yellow('Make sure dependencies are installed:'));
  console.log(chalk.gray('  cd packages/server && yarn install'));
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log();
    console.log(chalk.yellow(`Server exited with code ${code}`));
  }
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log();
  console.log(chalk.yellow('Shutting down server...'));
  serverProcess.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

