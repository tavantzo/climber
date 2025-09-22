#!/usr/bin/env node
const dc = require('docker-compose');
const path = require('path');
const chalk = require('chalk');
const configManager = require('./config');

(async function() {
  try {
    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    console.log(chalk.blue(`📊 Services status in ${environment} environment:\n`));

    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);
      const dirName = project.name;

      try {
        const result = await dc.ps({ cwd: folder });
        console.log(chalk.yellow(`[${i + 1}/${projects.length}] ${dirName} Services`));

        if (project.description) {
          console.log(chalk.gray(`   ${project.description}`));
        }

        console.log(result.out);

        if (i < projects.length - 1) {
          console.log(''); // Add spacing between projects
        }

      } catch (error) {
        console.error(chalk.red(`Error getting status for ${dirName}:`), error.message);
        throw error;
      }
    }

  } catch (error) {
    console.error(chalk.red('Error getting services status:'), error.message);
    process.exit(1);
  }
})();