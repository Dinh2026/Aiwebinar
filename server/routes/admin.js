// ============================================
// Admin Routes — Super Admin quản lý sub-accounts
// ============================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, superAdminOnly } = require('../middleware/auth');

router.use(authMiddleware);
router.use(superAdminOnly);

// GET /api/admin/sub-accounts
router.get('/sub-accounts', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT sa.*, u.full_name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM webinars w WHERE w.sub_account_id = sa.id) as webinar_count,
      (SELECT COUNT(*) FROM attendees a WHERE a.sub_account_id = sa.id) as attendee_count
      FROM sub_accounts sa JOIN users u ON u.id = sa.owner_user_id WHERE sa.status != 'deleted'`;
    const params = [];
    if (search) {
      query += ` AND (sa.name ILIKE $1 OR u.email ILIKE $1)`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY sa.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const result = await db.query(query, params);
    const countResult = await db.query(`SELECT COUNT(*) FROM sub_accounts WHERE status != 'deleted'`);
    res.json({ subAccounts: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page) });
  } catch (error) {
    console.error('List sub-accounts error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/sub-accounts
router.post('/sub-accounts', async (req, res) => {
  const client = await req.app.locals.db.connect();
  try {
    const { fullName, email, password, name, domainPrefix, plan = 'pro' } = req.body;
    if (!fullName || !email || !password || !name) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Email đã tồn tại' }); }
    const hash = await bcrypt.hash(password, 12);
    const userRes = await client.query(`INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'sub_admin') RETURNING *`, [fullName, email.toLowerCase().trim(), hash]);
    const user = userRes.rows[0];
    const saRes = await client.query(`INSERT INTO sub_accounts (owner_user_id, name, domain_prefix, plan) VALUES ($1, $2, $3, $4) RETURNING *`, [user.id, name, domainPrefix || name.toLowerCase().replace(/\s+/g, '-'), plan]);
    await client.query(`INSERT INTO user_sub_accounts (user_id, sub_account_id, role) VALUES ($1, $2, 'admin')`, [user.id, saRes.rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Tạo thành công', user: { id: user.id, email: user.email }, subAccount: saRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create sub-account error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  } finally { client.release(); }
});

// PATCH /api/admin/sub-accounts/:id
router.patch('/sub-accounts/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { name, plan, status } = req.body;
    const result = await db.query(`UPDATE sub_accounts SET name = COALESCE($1, name), plan = COALESCE($2, plan), status = COALESCE($3, status), updated_at = NOW() WHERE id = $4 RETURNING *`, [name, plan, status, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ subAccount: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// DELETE /api/admin/sub-accounts/:id
router.delete('/sub-accounts/:id', async (req, res) => {
  try {
    await req.app.locals.db.query(`UPDATE sub_accounts SET status = 'deleted' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Đã xóa' });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [a, w, att, s] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM sub_accounts WHERE status = 'active'`),
      db.query('SELECT COUNT(*) FROM webinars'),
      db.query('SELECT COUNT(*) FROM attendees'),
      db.query('SELECT COUNT(*) FROM webinar_sessions'),
    ]);
    res.json({ totalSubAccounts: +a.rows[0].count, totalWebinars: +w.rows[0].count, totalAttendees: +att.rows[0].count, totalSessions: +s.rows[0].count });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
