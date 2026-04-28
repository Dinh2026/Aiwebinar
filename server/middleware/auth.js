// ============================================
// Auth Middleware — JWT verification
// ============================================
const jwt = require('jsonwebtoken');

// Xác thực JWT token
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc thiếu' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token đã hết hạn' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

// Chỉ cho phép Super Admin
function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền truy cập' });
  }
  next();
}

// Middleware gắn subAccountId từ header hoặc user
async function tenantMiddleware(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Super admin có thể chỉ định sub account qua header
    if (req.user?.role === 'super_admin') {
      const subAccountId = req.headers['x-sub-account-id'];
      if (subAccountId) {
        req.subAccountId = subAccountId;
      }
      return next();
    }

    // Sub admin: lấy sub account từ database
    const result = await db.query(
      'SELECT sub_account_id FROM user_sub_accounts WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Không tìm thấy workspace' });
    }

    req.subAccountId = result.rows[0].sub_account_id;
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Lỗi xác thực tenant' });
  }
}

module.exports = { authMiddleware, superAdminOnly, tenantMiddleware };
