#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

(async function() {
  try {
    const environment = process.env.CLIMBER_ENV || 'default';
    const projects = configManager.getStartupOrder(environment);

    console.log(chalk.blue(`🚀 Starting services in ${environment} environment...`));
    console.log(chalk.cyan(`📋 Startup order: ${projects.map(p => p.name).join(' → ')}\n`));

    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);
      const dirName = project.name;

      try {
        console.log(chalk.blue(`[${i + 1}/${projects.length}] Starting ${dirName}...`));

        if (project.description) {
          console.log(chalk.gray(`   ${project.description}`));
        }

        const result = await dc.upAll({
          log: false,
          cwd: folder,
          commandOptions: ['--build', '--remove-orphans', '--force-recreate']
        });

        const status = await dc.ps({ cwd: folder });
        console.log(chalk.green(`✓ ${dirName} started successfully`));
        console.log(status.out);

        // Add a small delay between projects to ensure proper startup
        if (i < projects.length - 1) {
          console.log(chalk.gray('   Waiting 2 seconds before starting next project...\n'));
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(chalk.red(`✗ Failed to start services in ${dirName}:`), error.message);
        throw error;
      }
    }

    console.log(chalk.green(`\n🎉 All services started successfully in ${environment} environment!`));

  } catch (error) {
    console.error(chalk.red('Error starting services:'), error.message);
    process.exit(1);
  }
})();