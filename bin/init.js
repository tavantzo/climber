#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const find = require('find');
const chalk = require('chalk');

const home = process.env.HOME;
const pwd = process.env.PWD;

const file = path.join(home, '.climber-config', 'config.json');
const opts = {
  root: home,
  folders: []
}

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.question(chalk.green('Enter the root directory of your projects: '), (rootPath) => {
  opts.root = path.resolve(pwd, rootPath);
  rl.question(chalk.green('Would you like to auto discover directories contain a docker-compose file? [y/N] '), (yesOrNo) => {
    if (!yesOrNo || !yesOrNo.toUpperCase().startsWith('Y')) {
      readlineFolder();
    } else {
      console.info(`Please wait scanning ${opts.root} for docker-compose files...`);
      find.file(/docker-compose\.ya?ml/, opts.root, (files) => {
        if (!files || files.length === 0) {
          console.info(chalk.redBright('No files found. Entering manual mode.'))
          readlineFolder();
        } else {
          opts.folders = files.map((file) => path.dirname(file).split(path.sep).pop());
          rl.emit('complete');
        }
      });
    }
  })
});

rl.on("complete", () => {
  readlineExit();
})

rl.on("close", () => {
  console.info(chalk.yellow("Done!\nBYE BYE !!!"));
  fs.promises.mkdir(path.dirname(file), {recursive: true}).then(() => {
    fs.writeFileSync(file, JSON.stringify(opts, null, 2));
  })
  .catch((err) => console.error(err))
  .finally(() =>process.exit(0));
});


function readlineFolder() {
  rl.question(chalk.green('Enter a directory contains a docker-compose.yml file or nothing to exit: '), (folder) => {
    if (!folder || folder.trim().length === 0) {
      return rl.emit('complete');
    }
    opts.folders.push(folder.trim());
    readlineFolder();
  });
}

function readlineExit() {

  console.info(chalk.cyan(JSON.stringify(opts, null, 2)));

  rl.question(chalk.green(`Would you like to write the configuration above at ${file}? [y/N]`), (answer) => {
    if (!answer || answer.toUpperCase().startsWith('N')) {
      console.info(chalk.red('Aborted'));
      process.exit(1);
    } else {
      console.info(chalk.yellow('All set. You are good to go.'));
      rl.close();
    }
  })
}
