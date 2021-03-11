#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const folders = require('./folders');

(async function() {
  for await (result of startServices()) {
    console.log(chalk.green(result.out));
  }
})();

function* startServices() {
  for (let i = 0; i < folders.length; i += 1) {
    yield dc.upAll({
      log: false,
      cwd: folders[i],
      commandOptions: ['--build', '--remove-orphans', '--force-recreate']
    }).then(() => dc.ps({ cwd: folders[i] }))
  }
}