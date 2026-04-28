// ============================================
// Settings Routes — Cài đặt sub-account
// ============================================
const router = require('express').Router();
const { authMiddleware, tenantMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    if (!saId) return res.status(400).json({ error: 'Thiếu sub account' });
    const result = await db.query(
      `SELECT sa.*, u.full_name, u.email, u.avatar_url FROM sub_accounts sa 
       JOIN users u ON u.id = sa.owner_user_id WHERE sa.id = $1`, [saId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
    // Lấy integrations
    const integrations = await db.query('SELECT * FROM integrations WHERE sub_account_id = $1', [saId]);
    res.json({ settings: result.rows[0], integrations: integrations.rows });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// PATCH /api/settings
router.patch('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    const { name, settingsJson } = req.body;
    await db.query(`UPDATE sub_accounts SET name = COALESCE($1, name), settings_json = COALESCE($2, settings_json), updated_at = NOW() WHERE id = $3`, 
      [name, settingsJson ? JSON.stringify(settingsJson) : null, saId]);
    res.json({ message: 'Cập nhật thành công' });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

// PATCH /api/settings/integrations/:provider
router.patch('/integrations/:provider', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saId = req.subAccountId;
    const { provider } = req.params;
    const { config, enabled } = req.body;
    await db.query(
      `INSERT INTO integrations (sub_account_id, provider, config_encrypted, enabled) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (sub_account_id, provider) DO UPDATE SET config_encrypted = $3, enabled = $4, updated_at = NOW()`,
      [saId, provider, JSON.stringify(config), enabled]
    );
    res.json({ message: 'Cập nhật integration thành công' });
  } catch (error) { res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
