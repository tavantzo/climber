#!/usr/bin/env node
const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

(async function() {
  try {
    const args = process.argv.slice(2);
    const follow = args.includes('--follow') || args.includes('-f');
    const tail = args.find(arg => arg.startsWith('--tail='))?.split('=')[1] || '100';
    const service = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-')) || null;

    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    console.log(chalk.blue(`📋 Fetching logs from ${environment} environment...\n`));

    if (follow) {
      // In follow mode, we need to handle all projects differently
      // We'll spawn multiple processes and let them run concurrently
      console.log(chalk.blue('Following logs from all services... Press Ctrl+C to stop.\n'));

      const processes = [];

      for (let i = 0; i < projects.length; i += 1) {
        const project = projects[i];
        const folder = path.join(configManager.config.root, project.path);
        const dirName = project.name;

        console.log(chalk.yellow(`[${i + 1}/${projects.length}] Following ${dirName} services...`));
        if (project.description) {
          console.log(chalk.gray(`   ${project.description}`));
        }

        const commandArgs = ['compose', 'logs', '--tail', tail, '--follow'];

        if (service) {
          commandArgs.push(String(service));
        }

        const child = spawn('docker', commandArgs, {
          cwd: folder,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        // Add project name prefix to each log line
        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              console.log(chalk.cyan(`[${dirName}]`) + ' ' + line);
            }
          });
        });

        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              console.log(chalk.red(`[${dirName}]`) + ' ' + line);
            }
          });
        });

        child.on('error', (error) => {
          console.error(chalk.red(`Error following logs for ${dirName}:`), error.message);
        });

        processes.push(child);
      }

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\nStopping log following...'));
        processes.forEach(child => {
          child.kill('SIGTERM');
        });
        process.exit(0);
      });

      // Wait for all processes to complete (they won't in follow mode, but this keeps the script running)
      await Promise.all(processes.map(child => new Promise((resolve) => {
        child.on('close', resolve);
      })));

    } else {
      // Normal mode - process projects sequentially
      for (let i = 0; i < projects.length; i += 1) {
        const project = projects[i];
        const folder = path.join(configManager.config.root, project.path);
        const dirName = project.name;

        try {
          console.log(chalk.yellow(`\n[${i + 1}/${projects.length}] === ${dirName} Services ===`));

          if (project.description) {
            console.log(chalk.gray(`   ${project.description}`));
          }

          const commandArgs = ['compose', 'logs', '--tail', tail];

          if (service) {
            commandArgs.push(String(service));
          }

          console.log(chalk.gray(`   Running: docker ${commandArgs.join(' ')} in ${folder}`));

          const result = await new Promise((resolve, reject) => {
            const child = spawn('docker', commandArgs, {
              cwd: folder,
              stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            child.on('close', (code) => {
              if (code === 0) {
                resolve({ out: stdout, err: stderr });
              } else {
                reject(new Error(`Docker compose logs failed with exit code ${code}: ${stderr}`));
              }
            });

            child.on('error', (error) => {
              reject(error);
            });
          });

          console.log(result.out);
        } catch (error) {
          console.error(chalk.red(`Error getting logs for ${dirName}:`), error.message);
          throw error;
        }
      }
    }

  } catch (error) {
    console.error(chalk.red('Error fetching logs:'), error.message);
    process.exit(1);
  }
})();
