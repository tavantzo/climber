const fs = require('fs');
const path = require('path');

const configFile = path.join(process.env.HOME, '.climber-config', 'config.json');
const buffer = fs.readFileSync(configFile, { encoding: 'utf8' });
const config = JSON.parse(buffer);
const folders = config.folders.map(folder => path.join(config.root, folder));

module.exports = folders;