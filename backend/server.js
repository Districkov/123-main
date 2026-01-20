const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

// Load environment variables
require('dotenv').config();

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// CORS настройки
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const backendRoot = __dirname;
const frontendPath = path.join(backendRoot, '..', 'frontend');

// VirtualHost роутер для разных доменов
const mainRouter = express.Router();
const adminRouter = express.Router();

// initialize DB (if present)
try {
  const db = require('./db');
  if (db && typeof db.init === 'function') db.init();
  console.log('Database initialized');
} catch (e) {
  console.warn('Database initialization skipped (module missing or error):', e.message || e);
}

// ФИКСИРОВАННЫЙ ПАРОЛЬ
const FIXED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '8uyPRgEmLl';

// Middleware для проверки админского токена
function requireAdminToken(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const token = req.headers['x-admin-token'] || req.query.token;
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token is required'
    });
  }
  
  // Токен должен быть не пустым
  const trimmedToken = String(token).trim();
  
  if (trimmedToken) {
    next();
  } else {
    res.status(401).json({ 
      error: 'Invalid admin token'
    });
  }
}

// ПУБЛИЧНЫЙ эндпоинт для проверки статуса пароля (всегда true)
app.get('/admin/password-status', (req, res) => {
  try {
    console.log('GET /admin/password-status - Password always exists');
    res.json({
      passwordExists: true // Пароль всегда установлен
    });
  } catch (error) {
    console.error('Password status error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ПУБЛИЧНЫЙ эндпоинт для проверки пароля
app.post('/admin/verify-password', (req, res) => {
  try {
    console.log('POST /admin/verify-password - Body:', req.body);
    
    const { password } = req.body;
    
    if (!password) {
      console.log('Password is missing in request');
      return res.status(400).json({ error: 'Пароль обязателен' });
    }
    
    // Проверяем пароль
    console.log('Received password:', password);
    console.log('Expected password:', FIXED_ADMIN_PASSWORD);
    console.log('Passwords match:', password === FIXED_ADMIN_PASSWORD);
    
    const isValid = password === FIXED_ADMIN_PASSWORD;
    
    if (isValid) {
      console.log('Password verification: SUCCESS');
      // generate a simple session token (not cryptographically critical here)
      const crypto = require('crypto');
      const token = crypto.randomBytes(20).toString('hex');
      res.json({
        success: true,
        message: 'Авторизация успешна',
        token: token
      });
    } else {
      console.log('Password verification: FAILED');
      res.json({
        success: false,
        error: 'Неверный пароль'
      });
    }
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// Serve uploads directory (static files)
const uploadsPath = path.join(backendRoot, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Serve data JSONs
// Статические файлы для основного сайта
mainRouter.use(express.static(frontendPath));

// API endpoints основного сайта
mainRouter.use('/api/products', require('./routes/products'));
mainRouter.use('/api/articles', require('./routes/articles'));

// Legacy routes
mainRouter.use('/products', require('./routes/products'));
mainRouter.use('/articles', require('./routes/articles'));

// Auth routes (для админ-панели)
mainRouter.use('/auth', require('./routes/auth'));
mainRouter.use('/admin', require('./routes/admin'));

// SPA fallback для основного домена
mainRouter.get('*', (req, res) => {
  const file = path.join(frontendPath, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return res.sendFile(file);
  }
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

// ======================== АДМИН ДОМЕН (tremokony.admin.com) ========================
// Админ-панель доступна для всех пользователей (без авторизации)

// Admin routes (открыты для всех)
adminRouter.use('/admin', require('./routes/admin'));
adminRouter.use('/auth', require('./routes/auth'));

// Admin reinit endpoint
adminRouter.post('/admin/reinit-db', (req, res) => {
  try {
    const db = require('./db');
    if (db && typeof db.reinitFromJson === 'function') {
      const result = db.reinitFromJson();
      return res.json(result);
    }
    return res.status(500).json({ success: false, error: 'Database module not available' });
  } catch (err) {
    console.error('Reinit DB error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Serve admin panel (admin.html)
adminRouter.get('/', (req, res) => {
  const adminFile = path.join(frontendPath, 'admin.html');
  if (fs.existsSync(adminFile)) {
    return res.sendFile(adminFile);
  }
  return res.status(404).json({ error: 'Admin panel not found' });
});

// ======================== РОУТЕР VIRTUALHOST ========================
app.use((req, res, next) => {
  const hostname = req.hostname || 'localhost';
  console.log(`[VirtualHost] Request to: ${hostname} ${req.method} ${req.path}`);
  
  // Админ домен
  if (hostname === 'tremokony.admin.com' || hostname === 'admin.tremokony.com') {
    return adminRouter(req, res, next);
  }
  
  // Основной домен (все варианты)
  if (hostname === 'termokont.ru' || 
      hostname === 'www.termokont.ru' || 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      hostname === 'termokont' ||
      hostname === 'termokont.local' ||
      hostname === '185.176.94.21') {
    return mainRouter(req, res, next);
  }
  
  // Для локальной разработки - показываем основной сайт по умолчанию
  mainRouter(req, res, next);
});

const port = PORT;
app.listen(port, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Environment: ${NODE_ENV.toUpperCase()}`);
  console.log(`Server started on port ${port}`);
  console.log(`Backend root: ${backendRoot}`);
  console.log('\n=== VirtualHost Configuration ===');
  console.log('Main domain: termokont.ru (http://termokont.ru:' + port + ')');
  console.log('Admin domain: tremokony.admin.com (http://tremokony.admin.com:' + port + ')');
  console.log(`${'='.repeat(50)}\n`);
});