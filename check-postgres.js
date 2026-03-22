#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkPostgres() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hr_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  console.log('\n🔍 ตรวจสอบการเชื่อมต่อ PostgreSQL...\n');
  console.log('📊 ข้อมูลการเชื่อมต่อ:');
  console.log(`  • Host: ${config.host}`);
  console.log(`  • Port: ${config.port}`);
  console.log(`  • Database: ${config.database}`);
  console.log(`  • User: ${config.user}`);

  const client = new Client(config);

  try {
    console.log('\n⏳ กำลังเชื่อมต่อ...');
    await client.connect();
    console.log('✅ เชื่อมต่อสำเร็จ!\n');

    // ตรวจสอบเวอร์ชัน
    const version = await client.query('SELECT version()');
    console.log('📌 PostgreSQL Version:');
    console.log(version.rows[0].version);

    // ตรวจสอบตาราง
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log(`\n📋 ตารางที่มี (${tables.rows.length} ตาราง):`);
    if (tables.rows.length > 0) {
      tables.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.table_name}`);
      });
    } else {
      console.log('  ❌ ไม่มีตาราง (ต้องสร้างใหม่)');
    }

    await client.end();
    return true;
  } catch (error) {
    console.error(`\n❌ ไม่สามารถเชื่อมต่อได้:`);
    console.error(`  ${error.message}`);
    return false;
  }
}

checkPostgres().then(success => {
  process.exit(success ? 0 : 1);
});
