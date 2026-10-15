'use strict';
// Compatibility export. The current server uses lib/database.js directly.
// Database credentials come from backend/.env; no passwords are stored in source.
const mysql = require('mysql2');
const { load } = require('../lib/config');
const { options } = require('../lib/database');
module.exports = mysql.createPool(options(load()));
