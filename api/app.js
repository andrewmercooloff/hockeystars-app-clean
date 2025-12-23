#!/usr/bin/env node

/**
 * Entry point for cPanel Node.js application
 * This file is located in the 'api' folder created by cPanel
 * It loads and runs the actual API server from server/scripts/add-tester-api.js
 */

const path = require('path');

// Get the root directory (hockey-stars.com)
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');

// Change working directory to server folder (where package.json is)
process.chdir(serverDir);

// Load and run the actual API server
// __dirname in add-tester-api.js will be server/scripts/
require(path.join(serverDir, 'scripts', 'add-tester-api.js'));

