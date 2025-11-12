const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

const app = express();

// CORS настройки - должны быть перед всеми маршрутами
// Разрешаем все заголовки для упрощения отладки
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

// Middleware для проверки админского токена
function requireAdminToken(req, res, next) {
  // OPTIONS запросы уже обрабатываются глобально, пропускаем их
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Express автоматически приводит все заголовки к нижнему регистру
  // Поэтому проверяем только 'x-admin-token'
  const token = req.headers['x-admin-token'] || req.query.token;
  
  // Логирование для отладки
  console.log('\n=== Admin Auth Check ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Full URL:', req.url);
  console.log('Headers keys (filtered):', Object.keys(req.headers).filter(k => 
    k.toLowerCase().includes('token') || 
    k.toLowerCase().includes('authorization') ||
    k.toLowerCase() === 'content-type'
  ));
  console.log('x-admin-token header:', req.headers['x-admin-token'] ? `"${req.headers['x-admin-token']}"` : 'MISSING');
  console.log('Token extracted:', token ? `"${token}"` : 'MISSING');
  
  if (!token) {
    console.log('❌ ERROR: Token missing!');
    console.log('All available headers:', Object.keys(req.headers));
    // Показываем первые несколько символов каждого заголовка для отладки
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        console.log(`  ${key}: ${String(req.headers[key]).substring(0, 50)}`);
      }
    });
    return res.status(401).json({ 
      error: 'Token is required',
      hint: 'Make sure x-admin-token header is sent with the request',
      method: req.method,
      path: req.path,
      receivedHeaders: Object.keys(req.headers)
    });
  }
  
  // Токен должен быть точно ADMIN_TOKEN
  const trimmedToken = String(token).trim();
  console.log('Token check:');
  console.log('  Received:', `"${trimmedToken}"`);
  console.log('  Expected:', `"${ADMIN_TOKEN}"`);
  console.log('  Match:', trimmedToken === ADMIN_TOKEN);
  
  if (trimmedToken === ADMIN_TOKEN) {
    console.log('✅ Token valid, proceeding...\n');
    next();
  } else {
    console.log('❌ Token invalid!');
    console.log('  Received length:', trimmedToken.length);
    console.log('  Expected length:', ADMIN_TOKEN.length);
    console.log('  Characters match:', trimmedToken.split('').every((c, i) => c === ADMIN_TOKEN[i]));
    res.status(401).json({ 
      error: 'Invalid admin token',
      received: trimmedToken,
      receivedLength: trimmedToken.length,
      expected: ADMIN_TOKEN,
      expectedLength: ADMIN_TOKEN.length
    });
  }
}

// Serve data JSONs at /data/*.json for backward compatibility
app.get('/data/:name', (req, res) => {
  const name = req.params.name;
  const allowed = ['articles.json', 'products.json', 'project.json'];
  if (!allowed.includes(name)) return res.status(404).end();
  const file = path.join(backendRoot, 'data', name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

// Public API endpoints (mounted at /api/*)
app.use('/api/products', require('./routes/products'));
app.use('/api/articles', require('./routes/articles'));

// Keep previous non-/api routes for compatibility
app.use('/products', require('./routes/products'));
app.use('/articles', require('./routes/articles'));

// Admin routes (require auth) - ДОЛЖНЫ быть перед статическими файлами
app.use('/admin', requireAdminToken, require('./routes/admin'));

// Статические файлы - ПОСЛЕ API маршрутов
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
app.listen(port, () => console.log('Server started on port', port));