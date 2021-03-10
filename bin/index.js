#!/usr/bin/env node

const args = require('args');

args.command('init', 'Initialize the climber tool.');
args.command('up', 'Brings up all the services.', ['u']);
args.command('down', 'Stops all the services.', ['d']);
args.command('ps', 'Show processes status.');

args.parse(process.argv);
