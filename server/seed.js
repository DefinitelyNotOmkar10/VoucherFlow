require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  // Connect to default 'postgres' database first to ensure 'voucherflow' exists
  const rootUrl = dbUrl.replace(/\/voucherflow(\?.*)?$/, '/postgres$1');
  const client = new Client({ connectionString: rootUrl });
  try {
    await client.connect();
    const check = await client.query("SELECT 1 FROM pg_database WHERE datname = 'voucherflow'");
    if (check.rows.length === 0) {
      await client.query('CREATE DATABASE voucherflow');
      console.log('Created database voucherflow');
    }
  } catch (err) {
    console.log('Database check/create skipped:', err.message);
  } finally {
    await client.end();
  }

  // Connect to voucherflow and run schema.sql
  const pool = require('./db');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);

  const users = [
    {
      name: 'Diana Director',
      email: 'director@company.com',
      password: 'director123',
      role: 'DIRECTOR',
      employee_code: 'DIR-001',
    },
    {
      name: 'Alice Accounts',
      email: 'accounts@company.com',
      password: 'accounts123',
      role: 'ACCOUNTS',
      employee_code: 'ACC-001',
    },
    {
      name: 'Bob Employee',
      email: 'bob@company.com',
      password: 'employee123',
      role: 'EMPLOYEE',
      employee_code: 'EMP-001',
    },
    {
      name: 'Carol Employee',
      email: 'carol@company.com',
      password: 'employee123',
      role: 'EMPLOYEE',
      employee_code: 'EMP-002',
    },
  ];

  console.log('\n--- Seeding users ---\n');

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, employee_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, hash, user.role, user.employee_code]
    );
    console.log(`Role: ${user.role} | Email: ${user.email} | Password: ${user.password}`);
  }

  console.log('\n--- Seeding complete ---\n');
  await pool.end();
}

initDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
