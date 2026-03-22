import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;
const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'K@n50280754',
});

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

// ===== Employees APIs =====

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
      position_id, start_date, status, role
    } = req.body;

    const result = await pool.query(
      `INSERT INTO employees 
       (employee_code, first_name, last_name, email, phone, department_id, 
        position_id, start_date, status, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [employee_code, first_name, last_name, email, phone, department_id,
       position_id, start_date, status || 'active', role || 'employee']
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
