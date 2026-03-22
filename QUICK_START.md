# 🚀 PostgreSQL & Email Config - Quick Start

## 📊 PostgreSQL Database

### ✅ Configuration Ready

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hr_management"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="hr_management"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

### 🧪 Test Connection

```bash
# Bash test
bash test-db-connection.sh

# Node.js test
npm install pg
node test-db-connection.js
```

### 📝 Helper Functions

```typescript
import { getDatabaseConfig } from '@/config/database';

const config = getDatabaseConfig();
// { host: 'localhost', port: 5432, database: 'hr_management', ... }

const connString = getDatabaseConnectionString();
// postgresql://postgres:postgres@localhost:5432/hr_management
```

### 🔗 Use with Libraries

**pg (node-postgres):**
```typescript
import { Client } from 'pg';
import { getDatabaseConfig } from '@/config/database';

const client = new Client(getDatabaseConfig());
await client.connect();
const result = await client.query('SELECT * FROM employees');
await client.end();
```

**Prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 📧 Office365 Email

### ✅ Configuration Ready

```typescript
// File: supabase/functions/config/email-config.ts
const config = getEmailConfig();
// {
//   smtpHost: 'smtp.office365.com'
//   smtpPort: 587
//   smtpUsername: 'allsolution@tlogical.com'
//   smtpPassword: 'RA28d8Jj'
//   tlsEnabled: true
//   appUrl: 'http://localhost:5173'
// }
```

### 🧪 Test SMTP

```bash
deno run --allow-env --allow-net \
  supabase/functions/test-office365-smtp.ts
```

### 📝 Helper Functions

```typescript
import { getEmailConfig } from '../config/email-config.ts';

const config = getEmailConfig();
// Use for creating SMTP connection
```

### 🔗 Usage in Functions

```typescript
// In: create-employee-user/index.ts
import { getEmailConfig } from '../config/email-config.ts';

const config = getEmailConfig();
const client = new SMTPClient({
  connection: {
    hostname: config.smtpHost,
    port: config.smtpPort,
    tls: config.tlsEnabled,
    auth: {
      username: config.smtpUsername,
      password: config.smtpPassword,
    },
  },
});
```

---

## 📁 Files Structure

```
project/
├── .env                           ← Database + Email config
├── .env.example                   ← Template
├── src/config/database.ts         ← DB helper functions
├── DATABASE_CONFIG.md             ← DB documentation
├── test-db-connection.js          ← Node.js DB test
├── test-db-connection.sh          ← Bash DB test
├── supabase/functions/
│   ├── config/email-config.ts     ← Email config (centralized)
│   ├── create-employee-user/index.ts    ← Uses both configs
│   ├── reset-user-password/index.ts     ← Uses both configs
│   ├── utils/office365-email.ts         ← Uses email config
│   └── test-office365-smtp.ts           ← Tests email config
```

---

## ⚙️ Edit Credentials

### Database (PostgreSQL)

```bash
# 1. Edit: .env
DB_USER="new_user"
DB_PASSWORD="new_password"

# 2. Restart app
npm run dev
```

### Email (Office365)

```bash
# Option 1: Edit config file
# File: supabase/functions/config/email-config.ts
smtpUsername: "new-email@example.com"
smtpPassword: "newpass"

# Option 2: Use environment variables
# Set in .env or Supabase Secrets:
OFFICE365_EMAIL="new-email@example.com"
OFFICE365_PASSWORD="newpass"
```

---

## ✅ Quick Checklist

- [x] PostgreSQL Database configured
- [x] .env added with DB credentials
- [x] .env.example created
- [x] Database helper functions created
- [x] Office365 Email configured
- [x] Email config centralized
- [x] Test scripts created

### Next Steps

1. **Create Database** (if needed):
   ```bash
   createdb -U postgres hr_management
   ```

2. **Run DB Test**:
   ```bash
   node test-db-connection.js
   ```

3. **Run Email Test**:
   ```bash
   deno run --allow-env --allow-net supabase/functions/test-office365-smtp.ts
   ```

4. **Deploy**:
   ```bash
   supabase functions deploy create-employee-user
   supabase functions deploy reset-user-password
   ```

---

## 📞 Documentation

- 📖 Database: [DATABASE_CONFIG.md](./DATABASE_CONFIG.md)
- 📖 Email: [EMAIL_CONFIG_GUIDE.md](./EMAIL_CONFIG_GUIDE.md)
- 📖 Office365: [OFFICE365_README.md](./OFFICE365_README.md)

---

**Status:** ✅ Ready for Development & Deployment
