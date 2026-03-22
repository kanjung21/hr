/**
 * PostgreSQL Database Connection Test
 * ทดสอบการเชื่อมต่อ PostgreSQL Database จาก Node.js
 * 
 * Run:
 * node test-db-connection.js
 * 
 * หรือ
 * 
 * npm install pg
 * npx ts-node test-db-connection.ts
 */

// ถ้าใช้ TypeScript
// import { getDatabaseConfig, getDatabaseConnectionString, logDatabaseConfig } from './src/config/database';

// ถ้าใช้ JavaScript (ต้อง copy getDatabaseConfig ส่วน)
const getDatabaseConfig = () => {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "5432");
  const database = process.env.DB_NAME || "hr_management";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "postgres";
  const ssl = process.env.DB_SSL?.toLowerCase() === "true";

  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
  };
};

const getDatabaseConnectionString = () => {
  return (
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "postgres"}:${
      process.env.DB_PASSWORD || "postgres"
    }@${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || "5432"
    }/${process.env.DB_NAME || "hr_management"}`
  );
};

const logDatabaseConfig = () => {
  const config = getDatabaseConfig();
  console.log("📊 Database Configuration:");
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log(`  SSL: ${config.ssl ? "Enabled" : "Disabled"}`);
};

/**
 * Main Test Function
 */
async function testDatabaseConnection() {
  console.log("🔍 Testing PostgreSQL Database Connection...\n");

  try {
    // ตรวจสอบ .env
    if (!process.env.DB_HOST) {
      console.log("📝 No .env file loaded, using defaults...");
    } else {
      console.log("✅ .env file detected\n");
    }

    // แสดง configuration
    logDatabaseConfig();
    console.log("\n📝 Connection String:");
    console.log(getDatabaseConnectionString());

    // ลอง import pg
    let pg;
    try {
      pg = require("pg");
      console.log("\n✅ pg package found, testing connection...\n");
    } catch (error) {
      console.log(
        "\n⚠️  pg package not found. Install with: npm install pg\n"
      );
      console.log("Configuration is ready, but cannot test connection.");
      return;
    }

    // ทดสอบการเชื่อมต่อ
    const { Client } = pg;
    const config = getDatabaseConfig();

    const client = new Client(config);

    console.log("🔌 Attempting to connect to PostgreSQL...");
    await client.connect();
    console.log("✅ Connection successful!\n");

    // ทดสอบ query
    console.log("📊 Testing query...");
    const result = await client.query("SELECT version();");
    console.log("✅ Query successful!");
    console.log(`   PostgreSQL: ${result.rows[0].version.substring(0, 50)}...\n`);

    // ดูตาราง
    console.log("📋 Tables in database:");
    const tableResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );

    if (tableResult.rows.length === 0) {
      console.log("   (No tables found - database is empty)\n");
    } else {
      tableResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
      console.log("");
    }

    // ตรวจสอบ schemas
    console.log("🏗️  Schemas in database:");
    const schemaResult = await client.query(
      `SELECT schema_name FROM information_schema.schemata 
       WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'`
    );

    schemaResult.rows.forEach((row) => {
      console.log(`   - ${row.schema_name}`);
    });
    console.log("");

    // ปิด connection
    await client.end();

    console.log("🎉 All tests passed!");
    console.log("\n✅ Database is ready to use!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\n🔍 Troubleshooting:");
    console.error("  1. Ensure PostgreSQL is running on localhost:5432");
    console.error("  2. Check database name: hr_management");
    console.error("  3. Check credentials in .env");
    console.error("  4. Create database if needed: createdb -U postgres hr_management");
    process.exit(1);
  }
}

// Run test
testDatabaseConnection();
