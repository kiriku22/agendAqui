// Script para ejecutar migración 009
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'remoto.pronetsys.com.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'factufy-hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root87',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'database/migrations/009_allow_null_facturas_electronicas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando migración 009...');
    await client.query(sql);
    console.log('Migración 009 ejecutada exitosamente');

  } catch (error) {
    console.error('Error ejecutando migración:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
