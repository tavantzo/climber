#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const command = process.argv[2];

// Handle workspace command specially since it has subcommands
if (command === 'workspace') {
  const workspaceArgs = process.argv.slice(3); // Skip 'node', 'index.js', 'workspace'
  const workspaceScript = path.join(__dirname, 'workspace.js');

  const child = spawn('node', [workspaceScript, ...workspaceArgs], {
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    process.exit(code);
  });

  child.on('error', (err) => {
    console.error('Error running workspace command:', err.message);
    process.exit(1);
  });
} else {
  // For other commands, use the args library
  const args = require('args');

  args.command('init', 'Initialize the climber tool.');
  args.command('up', 'Brings up all the services.', ['u']);
  args.command('down', 'Stops all the services.', ['d']);
  args.command('ps', 'Show processes status.');
  args.command('logs', 'View logs from all services.', ['l']);
  args.command('restart', 'Restart all or specific services.', ['r']);
  args.command('clean', 'Clean up unused Docker resources.');
  args.command('config', 'Show current configuration and environment status.');

  args.parse(process.argv);
}
