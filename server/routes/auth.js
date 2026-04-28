// ============================================
// Auth Routes — Đăng nhập/đăng ký/quên mật khẩu
// ============================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.app.locals.db;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
    }

    // Tìm user theo email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const user = result.rows[0];

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Lấy sub_account nếu là sub_admin
    let subAccountId = null;
    let subAccountName = null;
    if (user.role !== 'super_admin') {
      const saResult = await db.query(
        `SELECT sa.id, sa.name FROM user_sub_accounts usa 
         JOIN sub_accounts sa ON sa.id = usa.sub_account_id 
         WHERE usa.user_id = $1 AND sa.status = 'active' LIMIT 1`,
        [user.id]
      );
      if (saResult.rows.length > 0) {
        subAccountId = saResult.rows[0].id;
        subAccountName = saResult.rows[0].name;
      }
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        subAccountId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Cập nhật last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        subAccountId,
        subAccountName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/auth/me — Lấy thông tin user hiện tại
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(
      'SELECT id, full_name, email, role, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    const user = result.rows[0];

    // Lấy sub_account info
    let subAccount = null;
    if (user.role !== 'super_admin') {
      const saResult = await db.query(
        `SELECT sa.* FROM user_sub_accounts usa 
         JOIN sub_accounts sa ON sa.id = usa.sub_account_id 
         WHERE usa.user_id = $1 AND sa.status = 'active' LIMIT 1`,
        [user.id]
      );
      if (saResult.rows.length > 0) {
        subAccount = saResult.rows[0];
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
      subAccount
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    // Trong MVP, chỉ trả về thông báo
    res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = req.app.locals.db;

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
