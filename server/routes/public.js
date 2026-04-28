// ============================================
// Public Routes — Phòng webinar công khai + Check-in
// ============================================
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');

// GET /api/public/room/:roomCode — Lấy thông tin webinar public
router.get('/room/:roomCode', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(
      `SELECT id, sub_account_id, title, description, room_code, video_type, video_url, 
       thumbnail_url, schedule_type, rrule, jit_window, jit_rounding, duration_seconds, 
       display_threshold, cta_enabled, cta_text, cta_url, cta_time_seconds, status
       FROM webinars WHERE room_code = $1 AND status = 'published'`,
      [req.params.roomCode]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy webinar' });
    res.json({ webinar: result.rows[0] });
  } catch (error) {
    console.error('Public room error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/public/room/:roomCode/chat — Lấy chat script
router.get('/room/:roomCode/chat', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const webinar = await db.query('SELECT id FROM webinars WHERE room_code = $1', [req.params.roomCode]);
    if (webinar.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    const result = await db.query(
      'SELECT time_offset_ms, name, message, role, color, is_pinned, pin_duration_seconds, scope FROM chat_messages WHERE webinar_id = $1 ORDER BY time_offset_ms, sort_order',
      [webinar.rows[0].id]
    );
    res.json({ messages: result.rows });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// GET /api/public/room/:roomCode/seeding — Lấy seeding notifications
router.get('/room/:roomCode/seeding', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const webinar = await db.query('SELECT id FROM webinars WHERE room_code = $1', [req.params.roomCode]);
    if (webinar.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    const result = await db.query(
      'SELECT time_offset_ms, customer_name, content FROM seeding_notifications WHERE webinar_id = $1 ORDER BY time_offset_ms, sort_order',
      [webinar.rows[0].id]
    );
    res.json({ notifications: result.rows });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// POST /api/public/room/:roomCode/checkin — Check-in vào webinar
router.post('/room/:roomCode/checkin', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { fullName, email, phone } = req.body;
    if (!fullName || !email) return res.status(400).json({ error: 'Họ tên và email là bắt buộc' });

    // Lấy webinar
    const webinar = await db.query('SELECT id, sub_account_id FROM webinars WHERE room_code = $1', [req.params.roomCode]);
    if (webinar.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy webinar' });
    const w = webinar.rows[0];

    // Kiểm tra đã check-in chưa
    const existing = await db.query(
      'SELECT id FROM attendees WHERE webinar_id = $1 AND email = $2',
      [w.id, email.toLowerCase().trim()]
    );

    let attendeeId;
    if (existing.rows.length > 0) {
      attendeeId = existing.rows[0].id;
      await db.query(`UPDATE attendees SET status = 'joined', full_name = $1, phone = $2 WHERE id = $3`, [fullName, phone, attendeeId]);
    } else {
      const result = await db.query(
        `INSERT INTO attendees (sub_account_id, webinar_id, full_name, email, phone, status, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,'joined',$6,$7) RETURNING id`,
        [w.sub_account_id, w.id, fullName, email.toLowerCase().trim(), phone, req.ip, req.headers['user-agent']]
      );
      attendeeId = result.rows[0].id;
    }

    // Tạo session
    const sessionToken = uuidv4();
    const session = await db.query(
      `INSERT INTO webinar_sessions (sub_account_id, webinar_id, attendee_id, session_token, device_type, browser)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [w.sub_account_id, w.id, attendeeId, sessionToken, req.body.deviceType || 'desktop', req.body.browser || 'unknown']
    );

    // Track event
    await db.query(
      `INSERT INTO analytics_events (sub_account_id, webinar_id, attendee_id, session_id, event_type) VALUES ($1,$2,$3,$4,'checkin_submitted')`,
      [w.sub_account_id, w.id, attendeeId, session.rows[0].id]
    );

    res.json({
      attendeeId,
      sessionId: session.rows[0].id,
      sessionToken,
      message: 'Check-in thành công'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/public/track — Track analytics events from viewer
router.post('/track', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { subAccountId, webinarId, attendeeId, sessionId, eventType, payload, videoTimeSeconds } = req.body;
    if (!webinarId || !eventType) return res.status(400).json({ error: 'Thiếu thông tin' });
    await db.query(
      `INSERT INTO analytics_events (sub_account_id, webinar_id, attendee_id, session_id, event_type, event_payload, video_time_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [subAccountId, webinarId, attendeeId, sessionId, eventType, JSON.stringify(payload || {}), videoTimeSeconds || 0]
    );
    // Update session last seen
    if (sessionId) {
      await db.query(`UPDATE webinar_sessions SET last_seen_at = NOW(), watch_duration_seconds = $1 WHERE id = $2`, [videoTimeSeconds || 0, sessionId]);
    }
    res.json({ ok: true });
  } catch (error) { res.status(200).json({ ok: true }); }
});

module.exports = router;
