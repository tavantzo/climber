#!/usr/bin/env node
const dc = require('docker-compose');
const path = require('path');
const folders = require('./folders');

folders.map((folder) => {
  dc.ps({
    cwd: folder,
  })
  .then((r) => {
    const dir = folder.split(path.sep).pop();
    console.log(`\n${dir} Services`);
    console.log(r.out);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
});