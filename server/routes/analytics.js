// ============================================
// Analytics Routes — Báo cáo & thống kê
// ============================================
const router = require('express').Router();
const { authMiddleware, tenantMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/analytics/overview — Dashboard tổng quan
router.get('/overview', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    const filter = saId ? 'WHERE sub_account_id = $1' : '';
    const params = saId ? [saId] : [];

    const [webinars, attendees, sessions, events] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM webinars ${filter}`, params),
      db.query(`SELECT COUNT(*) FROM attendees ${filter}`, params),
      db.query(`SELECT COUNT(*), COALESCE(SUM(watch_duration_seconds),0) as total_watch FROM webinar_sessions ${filter}`, params),
      db.query(`SELECT event_type, COUNT(*) as count FROM analytics_events ${filter} GROUP BY event_type`, params),
    ]);

    // Webinars gần đây
    const recentWebinars = await db.query(
      `SELECT id, title, status, created_at, (SELECT COUNT(*) FROM attendees a WHERE a.webinar_id = w.id) as attendee_count
       FROM webinars w ${filter} ORDER BY created_at DESC LIMIT 5`, params
    );

    // Attendees theo ngày (7 ngày gần nhất)
    const dailyAttendees = await db.query(
      `SELECT DATE(checked_in_at) as date, COUNT(*) as count FROM attendees ${filter} 
       AND checked_in_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(checked_in_at) ORDER BY date`.replace('AND', saId ? 'AND' : 'WHERE'),
      params
    );

    res.json({
      totalWebinars: +webinars.rows[0].count,
      totalAttendees: +attendees.rows[0].count,
      totalSessions: +sessions.rows[0].count,
      totalWatchSeconds: +sessions.rows[0].total_watch,
      eventBreakdown: events.rows,
      recentWebinars: recentWebinars.rows,
      dailyAttendees: dailyAttendees.rows,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/analytics/webinars/:id — Analytics cho từng webinar
router.get('/webinars/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const webinarId = req.params.id;

    const [attendees, sessions, events, chatEvents] = await Promise.all([
      db.query(`SELECT COUNT(*) as total, COUNT(DISTINCT email) as unique_emails FROM attendees WHERE webinar_id = $1`, [webinarId]),
      db.query(`SELECT COUNT(*) as total, COALESCE(AVG(watch_duration_seconds),0) as avg_watch, COALESCE(SUM(watch_duration_seconds),0) as total_watch, COALESCE(AVG(join_latency_ms),0) as avg_latency FROM webinar_sessions WHERE webinar_id = $1`, [webinarId]),
      db.query(`SELECT event_type, COUNT(*) as count FROM analytics_events WHERE webinar_id = $1 GROUP BY event_type`, [webinarId]),
      db.query(`SELECT COUNT(DISTINCT attendee_id) as active_chatters FROM analytics_events WHERE webinar_id = $1 AND event_type = 'chat_message_sent'`, [webinarId]),
    ]);

    // Retention curve (mốc 5 phút)
    const retention = await db.query(
      `SELECT FLOOR(watch_duration_seconds / 300) * 5 as minute_mark, COUNT(*) as viewers
       FROM webinar_sessions WHERE webinar_id = $1 GROUP BY minute_mark ORDER BY minute_mark`, [webinarId]
    );

    // Exit time distribution
    const exitDist = await db.query(
      `SELECT FLOOR(watch_duration_seconds / 60) as exit_minute, COUNT(*) as count
       FROM webinar_sessions WHERE webinar_id = $1 AND status = 'dropped' GROUP BY exit_minute ORDER BY exit_minute`, [webinarId]
    );

    res.json({
      totalAttendees: +attendees.rows[0].total,
      uniqueAttendees: +attendees.rows[0].unique_emails,
      totalSessions: +sessions.rows[0].total,
      avgWatchDuration: Math.round(+sessions.rows[0].avg_watch),
      totalWatchSeconds: +sessions.rows[0].total_watch,
      avgJoinLatency: Math.round(+sessions.rows[0].avg_latency),
      activeChatters: +chatEvents.rows[0].active_chatters,
      silentViewers: +attendees.rows[0].total - +chatEvents.rows[0].active_chatters,
      eventBreakdown: events.rows,
      retentionCurve: retention.rows,
      exitDistribution: exitDist.rows,
    });
  } catch (error) {
    console.error('Webinar analytics error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/analytics/events — Track event từ frontend
router.post('/events', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const evt of events) {
      await db.query(
        `INSERT INTO analytics_events (sub_account_id, webinar_id, attendee_id, session_id, event_type, event_payload, video_time_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [evt.subAccountId, evt.webinarId, evt.attendeeId, evt.sessionId, evt.eventType, JSON.stringify(evt.payload || {}), evt.videoTimeSeconds || 0]
      );
    }
    res.json({ message: 'ok' });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Lỗi' });
  }
});

module.exports = router;
