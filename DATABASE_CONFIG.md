# 📊 PostgreSQL Database Configuration

## ✅ ตั้งค่าเรียบร้อย!

ผมได้กำหนดค่า PostgreSQL Database ให้ที่ `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hr_management"

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="hr_management"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

---

## 📝 การใช้งาน

### วิธีที่ 1: ใช้ Connection String (ทั่วไป)

```typescript
import { getDatabaseConnectionString } from '@/config/database';

const connectionUrl = getDatabaseConnectionString();
console.log(connectionUrl);
// Output: postgresql://postgres:postgres@localhost:5432/hr_management
```

### วิธีที่ 2: ใช้ Config Object

```typescript
import { getDatabaseConfig } from '@/config/database';

const config = getDatabaseConfig();
console.log(config);
// Output: {
//   host: 'localhost',
//   port: 5432,
//   database: 'hr_management',
//   user: 'postgres',
//   password: 'postgres',
//   ssl: false
// }
```

---

## 🔗 ร่วมกับ Node.js Libraries

### ตัวเลือกที่ 1: node-postgres (pg)

```bash
npm install pg
```

```typescript
import { Client } from 'pg';
import { getDatabaseConfig } from '@/config/database';

const config = getDatabaseConfig();
const client = new Client(config);

await client.connect();
const result = await client.query('SELECT * FROM employees');
console.log(result.rows);
await client.end();
```

### ตัวเลือกที่ 2: pg + Connection Pooling

```typescript
import { Pool } from 'pg';
import { getDatabaseConnectionString } from '@/config/database';

const connectionString = getDatabaseConnectionString();
const pool = new Pool({ connectionString });

const result = await pool.query('SELECT * FROM employees');
console.log(result.rows);
```

### ตัวเลือกที่ 3: Prisma ORM

```bash
npm install @prisma/client
npx prisma init
```

**prisma/.env:**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hr_management"
```

**prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = await prisma.employees.findMany();
console.log(employees);
```

### ตัวเลือกที่ 4: Drizzle ORM

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit
```

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { getDatabaseConfig } from '@/config/database';

const config = getDatabaseConfig();
const client = new Client(config);

const db = drizzle(client);
const employees = await db.query.employees.findMany();
console.log(employees);
```

---

## 📂 ไฟล์ที่สร้าง

| ไฟล์ | ประเภท | ใช้งาน |
|------|--------|--------|
| `.env` | Configuration | ✅ อัปเดตแล้ว |
| `.env.example` | Template | ✅ สร้างแล้ว |
| `src/config/database.ts` | Helper | ✅ สร้างแล้ว |

---

## 🧪 ทดสอบการเชื่อมต่อ

### ใช้ psql (PostgreSQL CLI)

```bash
psql -h localhost -U postgres -d hr_management -c "SELECT version();"
```

ผลลัพธ์ที่คาดหวัง:
```
PostgreSQL 14.x...
```

### ใช้ Node.js

```bash
node -e "
const config = require('./src/config/database').getDatabaseConfig();
console.log('Database Config:', config);
"
```

---

## 🔐 ข้อควรระวัง

### ⚠️ Credentials ใน .env

- `.env` มี username/password จริง
- **ไม่ควร commit** `.env` ไปยัง git
- ใช้ `.env.example` สำหรับ template

### ✅ วิธีการปลอดภัย

1. **เพิ่ม .env ในไฟล์ .gitignore** (ซ้ำแล้ว)
   ```
   .env
   .env.local
   ```

2. **ใช้ .env.example**
   - Copy `.env.example` เป็น `.env`
   - แก้ไข credentials ตามต้องการ
   - Shareผู้อื่น `.env.example` แทน `.env`

3. **สำหรับ Production**
   - ใช้ Environment Variables จากระบบ
   - ไม่เก็บ hardcoded credentials

---

## 🔧 ปรับแต่ง Credentials

เมื่อต้องการเปลี่ยน username/password:

1. **เปิด:** `.env`
2. **แก้ไข:**
   ```env
   DB_USER="new_user"
   DB_PASSWORD="new_password"
   ```
3. **Restart** แอปพลิเคชัน

---

## 📋 ข้อมูล Default

| ตัวแปร | ค่า Default | ที่ตั้ง |
|------|------------|--------|
| DB_HOST | localhost | .env |
| DB_PORT | 5432 | .env |
| DB_NAME | hr_management | .env |
| DB_USER | postgres | .env |
| DB_PASSWORD | postgres | .env |
| DATABASE_URL | สร้างอัตโนมัติ | .env |

---

## 🚀 ขั้นตอนถัดไป

1. **ตรวจสอบ PostgreSQL** ทำงานอยู่บน localhost:5432
2. **สร้าง Database** (ถ้ายังไม่มี)
   ```bash
   createdb -U postgres hr_management
   ```
3. **ใช้ helper function**
   ```typescript
   import { getDatabaseConnectionString } from '@/src/config/database';
   ```
4. **Connect กับ Backend**
   - API routes
   - Database queries
   - Migration scripts

---

## 📞 การแก้ไขปัญหา

### ❌ "Cannot connect to database"

```bash
# ตรวจสอบว่า PostgreSQL ทำงาน
psql -V

# ลอง connect
psql -h localhost -U postgres
```

### ❌ "Database hr_management does not exist"

```bash
# สร้าง database
createdb -U postgres hr_management
```

### ❌ "Authentication failed for user"

```bash
# ตรวจสอบ .env
cat .env | grep DB_

# เปลี่ยน password ใน PostgreSQL
ALTER USER postgres WITH PASSWORD 'new_password';
```

---

## ✅ สถานะ

- ✅ PostgreSQL Configuration ตั้งค่า
- ✅ .env updated
- ✅ .env.example created
- ✅ Database helper created
- ✅ ตัวอย่างการใช้งาน

**Next:** Connect กับ backend แล้ว query database! 🚀
