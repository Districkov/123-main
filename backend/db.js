const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbFile = path.join(__dirname, 'data', 'app.db');
const productsJsonFile = path.join(__dirname, 'data', 'products.json');
const articlesJsonFile = path.join(__dirname, 'data', 'articles.json');
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbFile);

function init() {
  // products table with separate columns for each characteristic and SEO
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE,
      sku TEXT,
      category TEXT,
      title TEXT,
      photos TEXT,
      price REAL,
      quantity INTEGER,
      description TEXT,
      "диапазон" TEXT,
      "погрешность" TEXT,
      "визирование" TEXT,
      "принцип_действия" TEXT,
      "спектральный_диапазон" TEXT,
      "материалы" TEXT,
      "исполнение" TEXT,
      "быстродействие" TEXT,
      "точность" TEXT,
      "устройство_визирования" TEXT,
      "госреестр" TEXT,
      "для_малых_объектов" TEXT,
      "особенности" TEXT,
      "температура_мин" INTEGER,
      "температура_макс" INTEGER,
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `).run();

  // articles table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      category TEXT,
      title TEXT,
      excerpt TEXT,
      image TEXT,
      date TEXT,
      content TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `).run();

  seedFromJsonIfEmpty();
}

// Products API
function getProducts(q) {
  if (q && String(q).trim()) {
    const pattern = '%' + q.toLowerCase() + '%';
    const rows = db.prepare(`SELECT * FROM products WHERE lower(title) LIKE ? OR lower(sku) LIKE ? OR lower(category) LIKE ? OR lower(description) LIKE ? ORDER BY rowid DESC`).all(pattern, pattern, pattern, pattern);
    return rows.map(normalizeProductRow);
  }
  const rows = db.prepare(`SELECT * FROM products ORDER BY rowid DESC`).all();
  return rows.map(normalizeProductRow);
}

function getProductById(id) {
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(String(id));
  return row ? normalizeProductRow(row) : null;
}

function createProduct(p) {
  const now = new Date().toISOString();
  const ch = p.characteristics || {};
  const seo = p.seo || {};
  const stmt = db.prepare(`INSERT INTO products (id, sku, category, title, photos, price, quantity, description, "диапазон", "погрешность", "визирование", "принцип_действия", "спектральный_диапазон", "материалы", "исполнение", "быстродействие", "точность", "устройство_визирования", "госреестр", "для_малых_объектов", "особенности", "температура_мин", "температура_макс", seo_title, seo_description, seo_keywords, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const id = String(p.id || Date.now().toString());
  stmt.run(
    id,
    JSON.stringify(p.sku || ''),
    p.category || '',
    p.title || '',
    JSON.stringify(p.photos || []),
    p.price || 0,
    p.quantity || 0,
    p.description || '',
    ch['диапазон'] || '',
    ch['погрешность'] || '',
    ch['визирование'] || '',
    ch['принцип_действия'] || '',
    ch['спектральный_диапазон'] || '',
    JSON.stringify(ch['материалы'] || []),
    JSON.stringify(ch['исполнение'] || []),
    ch['быстродействие'] || '',
    ch['точность'] || '',
    ch['устройство_визирования'] || '',
    ch['госреестр'] || '',
    ch['для_малых_объектов'] || '',
    JSON.stringify(ch['особенности'] || []),
    parseInt(ch['температура_мин']) || 0,
    parseInt(ch['температура_макс']) || 0,
    seo.title || seo['seo_title'] || p.title || '',
    seo.description || seo['seo_description'] || p.description || '',
    seo.keywords || seo['seo_keywords'] || '',
    now
  );
  const created = getProductById(id);
  persistProductsToJson();
  return created;
}

// Save products to JSON file
function persistProductsToJson() {
  try {
    const products = db.prepare(`SELECT * FROM products ORDER BY rowid DESC`).all();
    const normalizedProducts = products.map(normalizeProductRow);
    fs.writeFileSync(productsJsonFile, JSON.stringify(normalizedProducts, null, 2), 'utf8');
    console.log('Products saved to JSON');
  } catch (err) {
    console.error('Error persisting products to JSON:', err);
  }
}

// Save articles to JSON file
function persistArticlesToJson() {
  try {
    const articles = db.prepare(`SELECT * FROM articles ORDER BY rowid DESC`).all();
    const normalizedArticles = articles.map(normalizeArticleRow);
    fs.writeFileSync(articlesJsonFile, JSON.stringify(normalizedArticles, null, 2), 'utf8');
    console.log('Articles saved to JSON');
  } catch (err) {
    console.error('Error persisting articles to JSON:', err);
  }
}

function updateProduct(id, p) {
  const now = new Date().toISOString();
  const existing = getProductById(id);
  if (!existing) return null;
  
  // Правильный merge для characteristics с поддержкой разных форматов ключей
  const existingCh = existing.characteristics || {};
  const pCh = p.characteristics || {};
  
  // Мержим characteristics, учитывая русские и английские названия
  const mergedCh = { ...existingCh };
  for (const key of Object.keys(pCh)) {
    // Всегда используем русские ключи (snake_case)
    mergedCh[key] = pCh[key];
  }
  
  const merged = {
    ...existing,
    ...p,
    characteristics: mergedCh
  };
  
  const ch = merged.characteristics || {};
  const seo = merged.seo || {};
  const stmt = db.prepare(`UPDATE products SET sku = ?, category = ?, title = ?, photos = ?, price = ?, quantity = ?, description = ?, "диапазон" = ?, "погрешность" = ?, "визирование" = ?, "принцип_действия" = ?, "спектральный_диапазон" = ?, "материалы" = ?, "исполнение" = ?, "быстродействие" = ?, "точность" = ?, "устройство_визирования" = ?, "госреестр" = ?, "для_малых_объектов" = ?, "особенности" = ?, "температура_мин" = ?, "температура_макс" = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, updatedAt = ? WHERE id = ?`);
  stmt.run(
    JSON.stringify(merged.sku || ''),
    merged.category || '',
    merged.title || '',
    JSON.stringify(merged.photos || []),
    merged.price || 0,
    merged.quantity || 0,
    merged.description || '',
    ch['диапазон'] || '',
    ch['погрешность'] || '',
    ch['визирование'] || '',
    ch['принцип_действия'] || '',
    ch['спектральный_диапазон'] || '',
    JSON.stringify(ch['материалы'] || []),
    JSON.stringify(ch['исполнение'] || []),
    ch['быстродействие'] || '',
    ch['точность'] || '',
    ch['устройство_визирования'] || '',
    ch['госреестр'] || '',
    ch['для_малых_объектов'] || '',
    JSON.stringify(ch['особенности'] || []),
    parseInt(ch['температура_мин']) || 0,
    parseInt(ch['температура_макс']) || 0,
    seo.title || seo['seo_title'] || merged.title || '',
    seo.description || seo['seo_description'] || merged.description || '',
    seo.keywords || seo['seo_keywords'] || '',
    now,
    id
  );
  const updated = getProductById(id);
  persistProductsToJson();
  return updated;
}

function deleteProduct(id) {
  const existing = getProductById(id);
  if (!existing) return null;
  db.prepare(`DELETE FROM products WHERE id = ?`).run(String(id));
  persistProductsToJson();
  return existing;
}

// Articles API
function getArticles(q) {
  if (q && String(q).trim()) {
    const pattern = '%' + q.toLowerCase() + '%';
    const rows = db.prepare(`SELECT * FROM articles WHERE lower(title) LIKE ? OR lower(category) LIKE ? OR lower(excerpt) LIKE ? ORDER BY rowid DESC`).all(pattern, pattern, pattern);
    return rows.map(normalizeArticleRow);
  }
  const rows = db.prepare(`SELECT * FROM articles ORDER BY rowid DESC`).all();
  return rows.map(normalizeArticleRow);
}

function getArticleById(id) {
  const row = db.prepare(`SELECT * FROM articles WHERE id = ?`).get(String(id));
  return row ? normalizeArticleRow(row) : null;
}

function createArticle(a) {
  const id = String(a.id || Date.now().toString());
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO articles (id, category, title, excerpt, image, date, content, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, a.category || '', a.title || '', a.excerpt || '', a.image || '', a.date || '', JSON.stringify(a.content || []), now);
  const created = getArticleById(id);
  persistArticlesToJson();
  return created;
}

function updateArticle(id, a) {
  const existing = getArticleById(id);
  if (!existing) return null;
  const merged = { ...existing, ...a };
  const now = new Date().toISOString();
  db.prepare(`UPDATE articles SET category = ?, title = ?, excerpt = ?, image = ?, date = ?, content = ?, updatedAt = ? WHERE id = ?`)
    .run(merged.category || '', merged.title || '', merged.excerpt || '', merged.image || '', merged.date || '', JSON.stringify(merged.content || []), now, id);
  const updated = getArticleById(id);
  persistArticlesToJson();
  return updated;
}

function deleteArticle(id) {
  const existing = getArticleById(id);
  if (!existing) return null;
  db.prepare(`DELETE FROM articles WHERE id = ?`).run(String(id));
  persistArticlesToJson();
  return existing;
}

function deleteAllProducts() {
  db.prepare(`DELETE FROM products`).run();
}

function deleteAllArticles() {
  db.prepare(`DELETE FROM articles`).run();
}

// helpers to parse JSON fields
function normalizeProductRow(row) {
  return {
    id: row.id,
    sku: tryParseJSON(row.sku),
    category: row.category,
    title: row.title,
    photos: tryParseJSON(row.photos) || [],
    price: row.price,
    quantity: row.quantity,
    description: row.description,
    characteristics: {
      диапазон: row.диапазон || '',
      погрешность: row.погрешность || '',
      визирование: row.визирование || '',
      принцип_действия: row.принцип_действия || '',
      спектральный_диапазон: row.спектральный_диапазон || '',
      материалы: tryParseJSON(row.материалы) || [],
      исполнение: tryParseJSON(row.исполнение) || [],
      быстродействие: row.быстродействие || '',
      точность: row.точность || '',
      устройство_визирования: row.устройство_визирования || '',
      госреестр: row.госреестр || '',
      для_малых_объектов: row.для_малых_объектов || '',
      особенности: tryParseJSON(row.особенности) || [],
      температура_мин: row.температура_мин || 0,
      температура_макс: row.температура_макс || 0
    },
    seo: {
      title: row.seo_title || '',
      description: row.seo_description || '',
      keywords: row.seo_keywords || ''
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

// Normalize characteristic values to unified formats for filtering/UX
function normalizeCharacteristics(ch) {
  if (!ch || typeof ch !== 'object') return {};

  const normalized = { ...ch };

  // Госреестр: normalize to 'да' / 'нет'
  if (normalized['Госреестр'] !== undefined) {
    const val = String(normalized['Госреестр']).toLowerCase();
    normalized['Госреестр'] = (val.includes('да') || val.includes('внес')) ? 'да' : 'нет';
  }

  // Малоразмерные объекты: normalize to 'да' / 'нет'
  if (normalized['Малоразмерные объекты'] !== undefined) {
    const val = String(normalized['Малоразмерные объекты']).toLowerCase();
    const isYes = val.includes('да') || val.includes('позволяет') || val.includes('yes');
    const isNo = val.includes('нет') || val.includes('не позволяет');
    normalized['Малоразмерные объекты'] = isYes ? 'да' : (isNo ? 'нет' : normalized['Малоразмерные объекты']);
  }

  // Измеряемые материалы и особенности — всегда массивы
  ['Измеряемые материалы и среды', 'Особенности применения'].forEach(key => {
    if (normalized[key] !== undefined) {
      if (Array.isArray(normalized[key])) {
        normalized[key] = normalized[key].filter(Boolean);
      } else if (normalized[key]) {
        normalized[key] = [normalized[key]].filter(Boolean);
      } else {
        normalized[key] = [];
      }
    }
  });

  return normalized;
}

function normalizeArticleRow(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    excerpt: row.excerpt,
    image: row.image,
    date: row.date,
    content: tryParseJSON(row.content) || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function tryParseJSON(v) {
  if (v === null || v === undefined) return null;
  try { return JSON.parse(v); } catch (e) { return v; }
}

// If tables are empty (fresh install), pull data from bundled JSON files
function seedFromJsonIfEmpty() {
  try {
    const productCount = db.prepare(`SELECT COUNT(*) as c FROM products`).get().c || 0;
    const articleCount = db.prepare(`SELECT COUNT(*) as c FROM articles`).get().c || 0;

    if (productCount === 0) {
      const productsPath = path.join(__dirname, 'data', 'products.json');
      if (fs.existsSync(productsPath)) {
        const raw = fs.readFileSync(productsPath, 'utf8') || '[]';
        const products = JSON.parse(raw);
        let imported = 0;
        for (const p of products) {
          try {
            createProduct(p);
            imported++;
          } catch (err) {
            console.warn('Product seed skipped:', err.message || err);
          }
        }
        console.log(`Seeded ${imported} products from products.json`);
      }
    }

    if (articleCount === 0) {
      const articlesPath = path.join(__dirname, 'data', 'articles.json');
      if (fs.existsSync(articlesPath)) {
        const raw = fs.readFileSync(articlesPath, 'utf8') || '[]';
        const articles = JSON.parse(raw);
        let imported = 0;
        for (const a of articles) {
          try {
            createArticle(a);
            imported++;
          } catch (err) {
            console.warn('Article seed skipped:', err.message || err);
          }
        }
        console.log(`Seeded ${imported} articles from articles.json`);
      }
    }
  } catch (err) {
    console.error('Database seed failed:', err);
  }
}

function persistProductsToJson() {
  try {
    const rows = db.prepare(`SELECT * FROM products ORDER BY rowid DESC`).all().map(normalizeProductRow);
    fs.writeFileSync(productsJsonFile, JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist products to JSON:', err);
  }
}

function persistArticlesToJson() {
  try {
    const rows = db.prepare(`SELECT * FROM articles ORDER BY rowid DESC`).all().map(normalizeArticleRow);
    fs.writeFileSync(articlesJsonFile, JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist articles to JSON:', err);
  }
}

module.exports = {
  init,
  // products
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteAllProducts,
  // articles
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  deleteAllArticles,
  // reinit
  reinitFromJson: function() {
    try {
      deleteAllProducts();
      deleteAllArticles();
      seedFromJsonIfEmpty();
      console.log('Database reinitialized from JSON files');
      return { success: true, message: 'Database reinitialized from JSON' };
    } catch (err) {
      console.error('Database reinit failed:', err);
      return { success: false, error: err.message };
    }
  }
};
