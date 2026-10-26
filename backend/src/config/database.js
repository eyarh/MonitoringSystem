const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

/*
 * node-postgres emits 'error' on idle clients when the server
 * closes a connection. Unhandled, that is an unhandled EventEmitter
 * error event, which terminates the process.
 */
pool.on('error', (error) => {

    console.error(
        'Unexpected database pool error:',
        error.message
    );
});

module.exports = pool;