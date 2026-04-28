// ============================================
// Seed Script — Khởi tạo Super Admin + Schema
// ============================================
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('📦 Đang chạy schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema đã được tạo');

    // Tạo Super Admin
    const email = process.env.SUPER_ADMIN_EMAIL || 'xdoanhso.data@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@2026';
    
    // Kiểm tra đã tồn tại chưa
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('⚠️ Super Admin đã tồn tại, bỏ qua...');
    } else {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'super_admin')`,
        ['Super Admin', email, hash]
      );
      console.log('✅ Super Admin đã được tạo');
      console.log(`   Email: ${email}`);
    }

    console.log('🎉 Seed hoàn tất!');
  } catch (error) {
    console.error('❌ Seed lỗi:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
