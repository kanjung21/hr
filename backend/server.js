import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { getDatabaseConfig } from './src/config/database.js';

const { Pool } = pkg;
const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secure_secret';

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool (using database.ts config helper)
const dbConfig = getDatabaseConfig();
const pool = new Pool(dbConfig);


// Test database connection
pool.on('connect', () => {
  console.log('✅ เชื่อมต่อ PostgreSQL สำเร็จ');
});

pool.on('error', (err) => {
  console.error('❌ ข้อผิดพลาด PostgreSQL:', err);
});

// ===== API Routes =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend API ทำงานปกติ' });
});

// Create user_auth table if not exists (for local auth)
const initAuthTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_auth (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
};

initAuthTable().catch((err) => {
  console.error('Failed to init user_auth table:', err);
});

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'employee', first_name, last_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email และ password ต้องระบุ' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO user_auth (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      [email, hashedPassword, role]
    );

    const user = result.rows[0];

    // Optional: สร้าง record ใน employees table หากส่งข้อมูลพนักงานมาด้วย
    let employee = null;
    if (first_name && last_name) {
      const empResult = await pool.query(
        'INSERT INTO employees (user_id, employee_code, first_name, last_name, email, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user.id, `EMP-${Date.now()}`, first_name, last_name, email, 'active']
      );
      employee = empResult.rows[0];
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, employee } });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email ต้องระบุ' });
    }
    // TODO: ส่งอีเมลรีเซ็ตรหัสผ่านโดยใช้ SMTP หรือวิธีการที่ต้องการ
    // นี่เป็นสถานะตัวอย่างเพื่อให้ UI ทำงานได้
    res.json({ message: 'ลิงก์รีเซ็ตรหัสผ่านถูกส่งแล้ว (จำลอง)' });
  } catch (error) {
    console.error('Error forgot-password:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email ต้องระบุ' });
    }

    // Try to find user in user_auth table
    let result = await pool.query('SELECT * FROM user_auth WHERE email = $1', [email]);
    let user = result.rows[0];

    // If user not found in user_auth but has password, reject
    if (!user && password) {
      return res.status(401).json({ error: 'รหัสผ่านหรืออีเมลไม่ถูกต้อง' });
    }

    // If user found, verify password
    if (user && password) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'รหัสผ่านหรืออีเมลไม่ถูกต้อง' });
    }

    // If user not found in user_auth, check employees table (for Office365)
    if (!user) {
      const empResult = await pool.query('SELECT user_id, email FROM employees WHERE LOWER(email) = LOWER($1)', [email]);
      const employee = empResult.rows[0];
      
      if (employee && employee.user_id) {
        // Check if user exists in user_auth
        const authCheck = await pool.query('SELECT * FROM user_auth WHERE id = $1', [employee.user_id]);
        if (authCheck.rows.length > 0) {
          user = authCheck.rows[0];
        } else {
          // Auto-create user_auth for Office365 users (without password)
          const autoUser = await pool.query(
            'INSERT INTO user_auth (id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [employee.user_id, email, await bcrypt.hash('office365_oauth', 10), 'employee']
          );
          user = autoUser.rows[0];
          console.log(`✅ Auto-created user_auth for Office365 user: ${email}`);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'ไม่พบอีเมลนี้ในระบบ กรุณาติดต่อ Admin' });
    }

    const rolesResult = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
    const roles = rolesResult.rows.map((r) => r.role);

    const employeeRes = await pool.query(
      'SELECT e.*, d.name as department_name, p.name as position_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id LEFT JOIN positions p ON e.position_id = p.id WHERE e.user_id = $1',
      [user.id]
    );
    const employee = employeeRes.rows[0] || null;

    const token = jwt.sign({ id: user.id, email: user.email, roles }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, roles, employee } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Office365 Login (Email only, no password required)
app.post('/api/auth/office365-login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email ต้องระบุ' });
    }

    // Check in employees table
    const empResult = await pool.query(
      'SELECT user_id, email, first_name, last_name FROM employees WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const employee = empResult.rows[0];

    if (!employee || !employee.user_id) {
      return res.status(401).json({ error: 'ไม่พบอีเมล Office365 นี้ในระบบ กรุณาติดต่อ Admin' });
    }

    // Check or auto-create in user_auth
    let result = await pool.query('SELECT * FROM user_auth WHERE id = $1', [employee.user_id]);
    let user = result.rows[0];

    if (!user) {
      const autoUser = await pool.query(
        'INSERT INTO user_auth (id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [employee.user_id, email, await bcrypt.hash('office365_oauth', 10), 'employee']
      );
      user = autoUser.rows[0];
      console.log(`✅ Auto-created user_auth for Office365 user: ${email}`);
    }

    const rolesResult = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
    const roles = rolesResult.rows.map((r) => r.role);

    const fullEmployeeRes = await pool.query(
      'SELECT e.*, d.name as department_name, p.name as position_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id LEFT JOIN positions p ON e.position_id = p.id WHERE e.user_id = $1',
      [user.id]
    );
    const fullEmployee = fullEmployeeRes.rows[0] || null;

    const token = jwt.sign({ id: user.id, email: user.email, roles }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, roles, employee: fullEmployee } });
  } catch (error) {
    console.error('Error Office365 login:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const authResult = await pool.query('SELECT id, email FROM user_auth WHERE id = $1', [userId]);
    const authUser = authResult.rows[0];
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const rolesResult = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [userId]);
    const roles = rolesResult.rows.map((r) => r.role);

    const employeeRes = await pool.query(
      'SELECT e.*, d.name as department_name, p.name as position_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id LEFT JOIN positions p ON e.position_id = p.id WHERE e.user_id = $1',
      [userId]
    );

    res.json({ user: { id: authUser.id, email: authUser.email, roles, employee: employeeRes.rows[0] ?? null } });
  } catch (error) {
    console.error('Error /api/auth/me:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Get user roles by user_id (for OAuth integration)
app.get('/api/user_roles/user/:user_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [req.params.user_id]);
    res.json(result.rows.map((r) => r.role));
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Optional: password reset and role update for employee actions
app.post('/api/employees/:id/reset-password', authenticate, async (req, res) => {
  try {
    const { new_password } = req.body;
    const empId = req.params.id;
    const empRes = await pool.query('SELECT user_id FROM employees WHERE id = $1', [empId]);
    const employee = empRes.rows[0];
    if (!employee || !employee.user_id) {
      return res.status(404).json({ error: 'ไม่พบพนักงานหรือ user_id ไม่มีค่า' });
    }

    const hashedPassword = await bcrypt.hash(new_password || `${Math.random().toString(36).slice(-8)}A!`, 10);
    await pool.query('UPDATE user_auth SET password_hash = $1 WHERE id = $2', [hashedPassword, employee.user_id]);

    res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

app.put('/api/employees/:id/role', authenticate, async (req, res) => {
  try {
    const { new_role } = req.body;
    const empId = req.params.id;
    const empRes = await pool.query('SELECT user_id FROM employees WHERE id = $1', [empId]);
    const employee = empRes.rows[0];
    if (!employee || !employee.user_id) {
      return res.status(404).json({ error: 'ไม่พบพนักงานหรือ user_id ไม่มีค่า' });
    }

    // Upsert role to user_roles
    await pool.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role)
       DO UPDATE SET role = EXCLUDED.role`,
      [employee.user_id, new_role]
    );

    res.json({ message: 'เปลี่ยนบทบาทสำเร็จ' });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ===== Employees APIs =====

// Get employee by user_id (for OAuth integration)
app.get('/api/employees/user/:user_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT e.*, d.name as department_name, p.name as position_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id LEFT JOIN positions p ON e.position_id = p.id WHERE e.user_id = $1',
      [req.params.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบพนักงานสำหรับผู้ใช้นี้' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee by user:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             d.name as department_name, 
             p.name as position_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      LEFT JOIN positions p ON e.position_id = p.id 
      ORDER BY e.employee_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
  }
});

// Get single employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, 
              d.name as department_name, 
              p.name as position_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       LEFT JOIN positions p ON e.position_id = p.id 
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const {
      employee_code, first_name, last_name, email, phone, department_id,
      position_id, start_date, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO employees 
       (employee_code, first_name, last_name, email, phone, department_id, 
        position_id, start_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [employee_code, first_name, last_name, email, phone, department_id,
       position_id, start_date, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างพนักงาน' });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    
    const result = await pool.query(
      `UPDATE employees SET ${fields} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพเดตพนักงาน' });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
    }
    res.json({ message: 'ลบพนักงานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบพนักงาน' });
  }
});

// ===== Departments APIs =====

app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ===== Positions APIs =====

app.get('/api/positions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM positions ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ===== Leave Types APIs =====

app.get('/api/leave-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leave_types ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ===== Leave Requests APIs =====

app.get('/api/leave-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lr.*, 
             e.first_name, e.last_name, e.email,
             lt.name as leave_type_name,
             approver.first_name as approver_first_name,
             approver.last_name as approver_last_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees approver ON lr.approved_by = approver.id
      ORDER BY lr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Create leave request
app.post('/api/leave-requests', async (req, res) => {
  try {
    const { employee_id, leave_type_id, start_date, end_date, reason } = req.body;
    
    const result = await pool.query(
      `INSERT INTO leave_requests 
       (employee_id, leave_type_id, start_date, end_date, reason, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
      [employee_id, leave_type_id, start_date, end_date, reason]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคำขอลา' });
  }
});

// Approve leave request
app.put('/api/leave-requests/:id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body;
    
    const result = await pool.query(
      `UPDATE leave_requests 
       SET status = 'approved', approved_by = $1, approved_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [approved_by, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Reject leave request
app.put('/api/leave-requests/:id/reject', async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    
    const result = await pool.query(
      `UPDATE leave_requests 
       SET status = 'rejected', rejection_reason = $1 
       WHERE id = $2 
       RETURNING *`,
      [rejection_reason, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ===== Holidays APIs =====

app.get('/api/holidays', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM holidays ORDER BY date');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API Server ทำงานที่: http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL at localhost:5432`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/employees`);
  console.log(`  POST /api/employees`);
  console.log(`  GET  /api/departments`);
  console.log(`  GET  /api/leave-types`);
  console.log(`  GET  /api/leave-requests\n`);
});
