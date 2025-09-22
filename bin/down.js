#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

(async function() {
  try {
    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    console.log(chalk.blue(`🛑 Stopping services in ${environment} environment...`));

    // Stop in reverse order to respect dependencies
    const reverseProjects = [...projects].reverse();

    for (let i = 0; i < reverseProjects.length; i += 1) {
      const project = reverseProjects[i];
      const folder = path.join(configManager.config.root, project.path);
      const dirName = project.name;

      try {
        console.log(chalk.blue(`[${i + 1}/${reverseProjects.length}] Stopping ${dirName}...`));

        await dc.stop({ cwd: folder });
        const result = await dc.ps({ cwd: folder });
        console.log(chalk.yellow(`✓ ${dirName} services stopped`));
        console.log(result.out);

      } catch (error) {
        console.error(chalk.red(`Error stopping services in ${dirName}:`), error.message);
        throw error;
      }
    }

    console.log(chalk.green(`\n🎉 All services stopped successfully in ${environment} environment!`));

  } catch (error) {
    console.error(chalk.red('Error stopping services:'), error.message);
    process.exit(1);
  }
})();