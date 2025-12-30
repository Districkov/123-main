const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbFile = path.join(__dirname, 'data', 'app.db');
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbFile);

function init() {
  // products table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      category TEXT,
      title TEXT,
      photos TEXT,
      price REAL,
      quantity INTEGER,
      description TEXT,
      characteristics TEXT,
      seo TEXT,
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
  const id = String(p.id || Date.now().toString());
  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO products (id, sku, category, title, photos, price, quantity, description, characteristics, seo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(id, JSON.stringify(p.sku || ''), p.category || '', p.title || '', JSON.stringify(p.photos || []), p.price || 0, p.quantity || 0, p.description || '', JSON.stringify(p.characteristics || {}), JSON.stringify(p.seo || {}), now);
  return getProductById(id);
}

function updateProduct(id, p) {
  const now = new Date().toISOString();
  const existing = getProductById(id);
  if (!existing) return null;
  const merged = {
    ...existing,
    ...p
  };
  const stmt = db.prepare(`UPDATE products SET sku = ?, category = ?, title = ?, photos = ?, price = ?, quantity = ?, description = ?, characteristics = ?, seo = ?, updatedAt = ? WHERE id = ?`);
  stmt.run(JSON.stringify(merged.sku || ''), merged.category || '', merged.title || '', JSON.stringify(merged.photos || []), merged.price || 0, merged.quantity || 0, merged.description || '', JSON.stringify(merged.characteristics || {}), JSON.stringify(merged.seo || {}), now, id);
  return getProductById(id);
}

function deleteProduct(id) {
  const existing = getProductById(id);
  if (!existing) return null;
  db.prepare(`DELETE FROM products WHERE id = ?`).run(String(id));
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
  return getArticleById(id);
}

function updateArticle(id, a) {
  const existing = getArticleById(id);
  if (!existing) return null;
  const merged = { ...existing, ...a };
  const now = new Date().toISOString();
  db.prepare(`UPDATE articles SET category = ?, title = ?, excerpt = ?, image = ?, date = ?, content = ?, updatedAt = ? WHERE id = ?`)
    .run(merged.category || '', merged.title || '', merged.excerpt || '', merged.image || '', merged.date || '', JSON.stringify(merged.content || []), now, id);
  return getArticleById(id);
}

function deleteArticle(id) {
  const existing = getArticleById(id);
  if (!existing) return null;
  db.prepare(`DELETE FROM articles WHERE id = ?`).run(String(id));
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
    characteristics: tryParseJSON(row.characteristics) || {},
    seo: tryParseJSON(row.seo) || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
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
