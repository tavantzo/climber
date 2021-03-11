#!/usr/bin/env node
const dc = require('docker-compose');
const path = require('path');
const chalk = require('chalk');
const folders = require('./folders');

folders.map((folder) => {
  dc.ps({
    cwd: folder,
  })
  .then((r) => {
    const dir = folder.split(path.sep).pop();
    console.log(chalk.yellow(`\n${dir} Services`));
    console.log(r.out);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
});