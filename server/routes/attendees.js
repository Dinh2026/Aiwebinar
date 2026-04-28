// ============================================
// Attendee Routes — Quản lý người tham gia
// ============================================
const router = require('express').Router();
const { authMiddleware, tenantMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/attendees
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    const { webinarId, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT a.*, w.title as webinar_title FROM attendees a JOIN webinars w ON w.id = a.webinar_id WHERE 1=1`;
    const params = [];
    let pi = 1;
    if (saId) { query += ` AND a.sub_account_id = $${pi++}`; params.push(saId); }
    if (webinarId) { query += ` AND a.webinar_id = $${pi++}`; params.push(webinarId); }
    if (status) { query += ` AND a.status = $${pi++}`; params.push(status); }
    if (search) { query += ` AND (a.full_name ILIKE $${pi} OR a.email ILIKE $${pi} OR a.phone ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    query += ` ORDER BY a.checked_in_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const result = await db.query(query, params);
    // Count
    let countQ = `SELECT COUNT(*) FROM attendees a WHERE 1=1`;
    const countParams = [];
    let ci = 1;
    if (saId) { countQ += ` AND a.sub_account_id = $${ci++}`; countParams.push(saId); }
    if (webinarId) { countQ += ` AND a.webinar_id = $${ci++}`; countParams.push(webinarId); }
    const countRes = await db.query(countQ, countParams);
    res.json({ attendees: result.rows, total: +countRes.rows[0].count, page: +page });
  } catch (error) {
    console.error('List attendees error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/attendees/:id
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`SELECT a.*, w.title as webinar_title FROM attendees a JOIN webinars w ON w.id = a.webinar_id WHERE a.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    // Lấy sessions
    const sessions = await db.query('SELECT * FROM webinar_sessions WHERE attendee_id = $1 ORDER BY started_at DESC', [req.params.id]);
    res.json({ attendee: result.rows[0], sessions: sessions.rows });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
