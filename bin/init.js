#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
var readline = require('readline');
const args = process.env.args;
const home = process.env.HOME;
const pwd = process.env.PWD;

const file = path.join(home, '.climber-config', 'config.json');
const opts = {
  root: '',
  folders: []
}

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.question('Enter the root directory of your projects: ', (rootPath) => {
  opts.root = path.resolve(pwd, rootPath);
  readlineFolder();
});

rl.on("close", function() {
  console.log("Done!\nBYE BYE !!!");

  fs.promises.mkdir(path.dirname(file), {recursive: true}).then(() => {
    fs.writeFileSync(file, JSON.stringify(opts, null, 2));
  })
  .catch((err) => console.error(err))
  .finally(() =>process.exit(0));
});


function readlineFolder() {
  rl.question('Enter a folder containing a docker-compose.yml file or nothing to exit: ', (folder) => {
    if (!folder || folder.trim().length === 0) {
      return rl.close();
    }
    opts.folders.push(folder.trim());
    readlineFolder();
  });
}