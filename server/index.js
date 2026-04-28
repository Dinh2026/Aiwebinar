// ============================================
// Ai Webinar SaaS — Main Server
// Brand: The Solo Shop
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4080;

// ============================================
// Database Connection
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test DB connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL kết nối thành công'))
  .catch(err => console.error('❌ Lỗi kết nối PostgreSQL:', err.message));

// Make pool available globally
app.locals.db = pool;

// ============================================
// Middleware
// ============================================
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false 
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Sub-Account-Id']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Quá nhiều request, vui lòng thử lại sau.' }
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Routes
// ============================================
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const webinarRoutes = require('./routes/webinars');
const attendeeRoutes = require('./routes/attendees');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const publicRoutes = require('./routes/public');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webinars', webinarRoutes);
app.use('/api/attendees', attendeeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), brand: 'The Solo Shop' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Lỗi server nội bộ',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ai Webinar Server chạy trên port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🏪 Brand: The Solo Shop`);
});

module.exports = app;
