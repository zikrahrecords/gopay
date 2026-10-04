require('dotenv').config();
const fs = require('fs'), path = require('path'), { pool } = require('../src/db');
pool.query(fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8'))
  .then(() => { console.log('Migration complete'); return pool.end(); })
  .catch(e => { console.error(e); process.exit(1); });
