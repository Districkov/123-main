const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();

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

// initialize DB (if present)
try {
  const db = require('./db');
  if (db && typeof db.init === 'function') db.init();
  console.log('Database initialized');
} catch (e) {
  console.warn('Database initialization skipped (module missing or error):', e.message || e);
}

// ФИКСИРОВАННЫЙ ПАРОЛЬ
const FIXED_ADMIN_PASSWORD = '8uyPRgEmLl';

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

// Serve data JSONs
app.get('/data/:name', (req, res) => {
  const name = req.params.name;
  const allowed = ['articles.json', 'products.json', 'project.json'];
  if (!allowed.includes(name)) return res.status(404).end();
  const file = path.join(backendRoot, 'data', name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

// Public API endpoints
app.use('/api/products', require('./routes/products'));
app.use('/api/articles', require('./routes/articles'));

// Keep previous non-/api routes for compatibility
app.use('/products', require('./routes/products'));
app.use('/articles', require('./routes/articles'));

// Admin routes (require auth)
app.use('/admin', requireAdminToken, require('./routes/admin'));

// Auth routes (require auth)
app.use('/auth', requireAdminToken, require('./routes/auth'));

// Serve uploaded files (images) from backend/uploads at /uploads
app.use('/uploads', express.static(path.join(backendRoot, 'uploads')));

// Статические файлы
app.use(express.static(frontendPath));

// SPA fallback
app.get('*', (req, res) => {
  const file = path.join(frontendPath, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return res.sendFile(file);
  }
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server started on port', port);
  console.log('Fixed admin password:', FIXED_ADMIN_PASSWORD);
  console.log('Backend root:', backendRoot);
});