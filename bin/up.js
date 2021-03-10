#!/usr/bin/env node
const dc = require('docker-compose');
const path = require('path');
const folders = require('./folders');

folders.map((folder) => {
  dc.upAll({
    log: true,
    cwd: folder,
    commandOptions: ['--build', '--remove-orphans', '--force-recreate'],
  }).then(() => {
    return dc.ps({ cwd: folder })
  })
  .then((r) => {
    const dir = folder.split(path.sep).pop();
    console.log(`\n${dir} services started.`);
    console.log(r.out);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
});