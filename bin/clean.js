#!/usr/bin/env node
const { execSync } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

(async function() {
  try {
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f');
    const volumes = args.includes('--volumes') || args.includes('-v');
    const images = args.includes('--images') || args.includes('-i');
    const networks = args.includes('--networks') || args.includes('-n');
    const all = args.includes('--all') || args.includes('-a');

    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    console.log(chalk.blue(`🧹 Cleaning up Docker resources in ${environment} environment...\n`));

    // Clean up each project's compose environment
    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);
      const dirName = project.name;

      try {
        console.log(chalk.blue(`[${i + 1}/${projects.length}] Cleaning up ${dirName}...`));

        if (project.description) {
          console.log(chalk.gray(`   ${project.description}`));
        }

        // Stop and remove containers, networks, and optionally volumes
        const downCommand = ['docker-compose', 'down'];
        if (volumes || all) {
          downCommand.push('--volumes');
        }
        if (networks || all) {
          downCommand.push('--remove-orphans');
        }

        execSync(downCommand.join(' '), {
          cwd: folder,
          stdio: 'pipe'
        });

        console.log(chalk.green(`✓ ${dirName} containers and networks cleaned`));
      } catch (error) {
        console.error(chalk.yellow(`Warning: Could not clean ${dirName}:`), error.message);
      }
    }

    // Clean up system-wide Docker resources
    if (images || all) {
      try {
        console.log(chalk.blue('\nCleaning up unused images...'));

        if (force) {
          execSync('docker image prune -af', { stdio: 'inherit' });
        } else {
          execSync('docker image prune -f', { stdio: 'inherit' });
        }

        console.log(chalk.green('✓ Unused images cleaned'));
      } catch (error) {
        console.error(chalk.yellow('Warning: Could not clean images:'), error.message);
      }
    }

    if (volumes || all) {
      try {
        console.log(chalk.blue('\nCleaning up unused volumes...'));

        if (force) {
          execSync('docker volume prune -f', { stdio: 'inherit' });
        } else {
          execSync('docker volume prune -f', { stdio: 'inherit' });
        }

        console.log(chalk.green('✓ Unused volumes cleaned'));
      } catch (error) {
        console.error(chalk.yellow('Warning: Could not clean volumes:'), error.message);
      }
    }

    if (networks || all) {
      try {
        console.log(chalk.blue('\nCleaning up unused networks...'));
        execSync('docker network prune -f', { stdio: 'inherit' });
        console.log(chalk.green('✓ Unused networks cleaned'));
      } catch (error) {
        console.error(chalk.yellow('Warning: Could not clean networks:'), error.message);
      }
    }

    // System-wide cleanup
    if (all) {
      try {
        console.log(chalk.blue('\nPerforming system-wide cleanup...'));
        execSync('docker system prune -f', { stdio: 'inherit' });
        console.log(chalk.green('✓ System-wide cleanup completed'));
      } catch (error) {
        console.error(chalk.yellow('Warning: Could not perform system cleanup:'), error.message);
      }
    }

    console.log(chalk.green('\n🎉 Cleanup completed successfully!'));

    // Show current disk usage
    try {
      console.log(chalk.blue('\nCurrent Docker disk usage:'));
      execSync('docker system df', { stdio: 'inherit' });
    } catch (error) {
      // Ignore errors for this informational command
    }

  } catch (error) {
    console.error(chalk.red('Error during cleanup:'), error.message);
    process.exit(1);
  }
})();
