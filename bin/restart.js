#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

(async function() {
  try {
    const args = process.argv.slice(2);
    const service = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-')) || null;
    const timeout = args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '10';
    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    if (service) {
      console.log(chalk.blue(`🔄 Restarting service "${service}" in ${environment} environment...\n`));
    } else {
      console.log(chalk.blue(`🔄 Restarting all services in ${environment} environment...\n`));
    }

    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);
      const dirName = project.name;

      try {
        console.log(chalk.blue(`[${i + 1}/${projects.length}] Restarting services in ${dirName}...`));

        if (project.description) {
          console.log(chalk.gray(`   ${project.description}`));
        }

        const restartOptions = {
          cwd: folder,
          commandOptions: ['--timeout', timeout]
        };

        if (service) {
          restartOptions.commandOptions.push(service);
        }

        await dc.restart(restartOptions);

        // Show status after restart
        const result = await dc.ps({ cwd: folder });
        console.log(chalk.green(`✓ ${dirName} services restarted successfully`));
        console.log(result.out);

        if (i < projects.length - 1) {
          console.log(''); // Add spacing between projects
        }

      } catch (error) {
        console.error(chalk.red(`Error restarting services in ${dirName}:`), error.message);
        throw error;
      }
    }

    console.log(chalk.green(`\n🎉 All services restarted successfully in ${environment} environment!`));
  } catch (error) {
    console.error(chalk.red('Error restarting services:'), error.message);
    process.exit(1);
  }
})();
