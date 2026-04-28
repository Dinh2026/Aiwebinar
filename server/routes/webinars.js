// ============================================
// Webinar Routes — CRUD + Chat Script + Seeding
// ============================================
const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, tenantMiddleware } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(authMiddleware);
router.use(tenantMiddleware);

// Tạo room code 8 số
function generateRoomCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Parse time offset từ nhiều format
function parseTimeOffset(val) {
  if (typeof val === 'number') return Math.round(val * 1000);
  const str = String(val).trim();
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parseInt(str) * 1000 || 0;
}

// GET /api/webinars
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    let query = 'SELECT * FROM webinars';
    const params = [];
    if (saId) { query += ' WHERE sub_account_id = $1'; params.push(saId); }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json({ webinars: result.rows });
  } catch (error) {
    console.error('List webinars error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/webinars/:id
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM webinars WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy webinar' });
    const webinar = result.rows[0];
    if (req.subAccountId && webinar.sub_account_id !== req.subAccountId) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    // Lấy chat messages và seeding
    const [chatRes, seedRes] = await Promise.all([
      db.query('SELECT * FROM chat_messages WHERE webinar_id = $1 ORDER BY time_offset_ms, sort_order', [req.params.id]),
      db.query('SELECT * FROM seeding_notifications WHERE webinar_id = $1 ORDER BY time_offset_ms, sort_order', [req.params.id]),
    ]);
    res.json({ webinar, chatMessages: chatRes.rows, seedingNotifications: seedRes.rows });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// POST /api/webinars
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    if (!saId) return res.status(400).json({ error: 'Thiếu sub account' });
    const { title, description, videoType, videoUrl, thumbnailUrl, scheduleType, rrule, jitWindow, jitRounding, displayThreshold, ctaEnabled, ctaText, ctaUrl, ctaTimeSeconds, durationSeconds } = req.body;
    if (!title) return res.status(400).json({ error: 'Tiêu đề là bắt buộc' });
    let roomCode = generateRoomCode();
    // Đảm bảo unique
    let exists = true;
    while (exists) {
      const check = await db.query('SELECT id FROM webinars WHERE room_code = $1', [roomCode]);
      if (check.rows.length === 0) exists = false;
      else roomCode = generateRoomCode();
    }
    const result = await db.query(
      `INSERT INTO webinars (sub_account_id, title, description, room_code, video_type, video_url, thumbnail_url, schedule_type, rrule, jit_window, jit_rounding, display_threshold, cta_enabled, cta_text, cta_url, cta_time_seconds, duration_seconds, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft') RETURNING *`,
      [saId, title, description, roomCode, videoType || 'mp4', videoUrl, thumbnailUrl, scheduleType || 'on_demand', rrule, jitWindow || 15, jitRounding || 5, displayThreshold || 0, ctaEnabled || false, ctaText, ctaUrl, ctaTimeSeconds, durationSeconds || 0]
    );
    res.status(201).json({ webinar: result.rows[0] });
  } catch (error) {
    console.error('Create webinar error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PATCH /api/webinars/:id
router.patch('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { title, description, videoType, videoUrl, thumbnailUrl, scheduleType, rrule, jitWindow, jitRounding, displayThreshold, status, ctaEnabled, ctaText, ctaUrl, ctaTimeSeconds, durationSeconds } = req.body;
    const result = await db.query(
      `UPDATE webinars SET title=COALESCE($1,title), description=COALESCE($2,description), video_type=COALESCE($3,video_type), video_url=COALESCE($4,video_url), thumbnail_url=COALESCE($5,thumbnail_url), schedule_type=COALESCE($6,schedule_type), rrule=COALESCE($7,rrule), jit_window=COALESCE($8,jit_window), jit_rounding=COALESCE($9,jit_rounding), display_threshold=COALESCE($10,display_threshold), status=COALESCE($11,status), cta_enabled=COALESCE($12,cta_enabled), cta_text=COALESCE($13,cta_text), cta_url=COALESCE($14,cta_url), cta_time_seconds=COALESCE($15,cta_time_seconds), duration_seconds=COALESCE($16,duration_seconds), updated_at=NOW() WHERE id=$17 RETURNING *`,
      [title, description, videoType, videoUrl, thumbnailUrl, scheduleType, rrule, jitWindow, jitRounding, displayThreshold, status, ctaEnabled, ctaText, ctaUrl, ctaTimeSeconds, durationSeconds, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ webinar: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// DELETE /api/webinars/:id
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.db.query('DELETE FROM webinars WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa webinar' });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// POST /api/webinars/:id/chat-script — Upload chat script Excel/CSV
router.post('/:id/chat-script', upload.single('file'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const webinarId = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'Vui lòng upload file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return res.status(400).json({ error: 'File rỗng' });
    // Xóa chat cũ
    await db.query('DELETE FROM chat_messages WHERE webinar_id = $1', [webinarId]);
    // Lấy sub_account_id từ webinar
    const wRes = await db.query('SELECT sub_account_id FROM webinars WHERE id = $1', [webinarId]);
    const saId = wRes.rows[0]?.sub_account_id;
    // Insert từng dòng
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      await db.query(
        `INSERT INTO chat_messages (sub_account_id, webinar_id, time_offset_ms, name, message, role, color, is_pinned, pin_duration_seconds, scope, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [saId, webinarId, parseTimeOffset(row.time_offset || row.timeOffset || 0), row.name || 'Guest', row.message || '', row.role || 'viewer', row.color || '#6366f1', row.pin === 'true' || row.pin === true, parseInt(row.pin_duration || row.pinDuration || 0), row.scope || 'broadcast', i]
      );
    }
    res.json({ message: 'Upload thành công', count: data.length });
  } catch (error) {
    console.error('Upload chat script error:', error);
    res.status(500).json({ error: 'Lỗi xử lý file' });
  }
});

// POST /api/webinars/:id/seeding-notifications — Upload seeding
router.post('/:id/seeding-notifications', upload.single('file'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const webinarId = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'Vui lòng upload file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    await db.query('DELETE FROM seeding_notifications WHERE webinar_id = $1', [webinarId]);
    const wRes = await db.query('SELECT sub_account_id FROM webinars WHERE id = $1', [webinarId]);
    const saId = wRes.rows[0]?.sub_account_id;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      await db.query(
        `INSERT INTO seeding_notifications (sub_account_id, webinar_id, time_offset_ms, customer_name, content, sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
        [saId, webinarId, parseTimeOffset(row.time_offset || row.timeOffset || 0), row.customer_name || row.customerName || 'Guest', row.content || '', i]
      );
    }
    res.json({ message: 'Upload thành công', count: data.length });
  } catch (error) {
    console.error('Upload seeding error:', error);
    res.status(500).json({ error: 'Lỗi xử lý file' });
  }
});

module.exports = router;
