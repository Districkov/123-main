const path = require('path');
const fs = require('fs');

// Try to use better-sqlite3, fall back to sqlite3
let Database;
let db;
let isAsync = false;

try {
  Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'data', 'app.db'));
  console.log('[DB] Using better-sqlite3 (synchronous)');
} catch (e) {
  console.log('[DB] better-sqlite3 not available, using sqlite3 (async wrapper)');
  isAsync = true;
  const sqlite3 = require('sqlite3');
  const sqliteDb = new sqlite3.Database(path.join(__dirname, 'data', 'app.db'), (err) => {
    if (err) console.error('[DB] Error opening database:', err);
    else console.log('[DB] SQLite database opened');
  });
  // Wrap sqlite3 to provide synchronous-like interface
  db = {
    _db: sqliteDb,
    run: function(sql, params = []) {
      return new Promise((resolve, reject) => {
        this._db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    get: function(sql, params = []) {
      return new Promise((resolve, reject) => {
        this._db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    all: function(sql, params = []) {
      return new Promise((resolve, reject) => {
        this._db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    },
    prepare: function(sql) {
      // For compatibility, return wrapper
      return {
        run: (params) => this.run(sql, params),
        get: (params) => this.get(sql, params),
        all: (params) => this.all(sql, params)
      };
    }
  };
}

const dbFile = path.join(__dirname, 'data', 'app.db');
const productsJsonFile = path.join(__dirname, 'data', 'products.json');
const articlesJsonFile = path.join(__dirname, 'data', 'articles.json');
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

async function init() {
  try {
    // Create tables
    const createProductsTable = `
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
    `;

    const createArticlesTable = `
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
    `;

    if (isAsync) {
      await db.run(createProductsTable);
      await db.run(createArticlesTable);
    } else {
      db.prepare(createProductsTable).run();
      db.prepare(createArticlesTable).run();
    }

    console.log('[DB] Tables created/verified');
    await seedFromJsonIfEmpty();
  } catch (e) {
    console.error('[DB] Init error:', e.message);
  }
}

async function seedFromJsonIfEmpty() {
  try {
    let count;
    if (isAsync) {
      const result = await db.get('SELECT COUNT(*) as cnt FROM products');
      count = result ? result.cnt : 0;
    } else {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
      count = result ? result.cnt : 0;
    }

    if (count === 0) {
      console.log('[DB] Database empty, seeding from JSON...');

      // Seed products
      if (fs.existsSync(productsJsonFile)) {
        try {
          const products = JSON.parse(fs.readFileSync(productsJsonFile, 'utf8'));
          if (Array.isArray(products) && products.length > 0) {
            for (const product of products) {
              const id = product.id || `prod-${Date.now()}-${Math.random()}`;
              const photos = JSON.stringify(product.photos || []);

              const sql = `
                INSERT OR REPLACE INTO products (
                  id, sku, category, title, photos, price, quantity, description,
                  "диапазон", "погрешность", "визирование", "принцип_действия",
                  "спектральный_диапазон", "материалы", "исполнение", "быстродействие",
                  "точность", "устройство_визирования", "госреестр", "для_малых_объектов",
                  "особенности", "температура_мин", "температура_макс",
                  seo_title, seo_description, seo_keywords, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const params = [
                id,
                product.sku || '',
                product.category || '',
                product.title || '',
                photos,
                product.price || 0,
                product.quantity || 0,
                product.description || '',
                product['диапазон'] || '',
                product['погрешность'] || '',
                product['визирование'] || '',
                product['принцип_действия'] || '',
                product['спектральный_диапазон'] || '',
                product['материалы'] || '',
                product['исполнение'] || '',
                product['быстродействие'] || '',
                product['точность'] || '',
                product['устройство_визирования'] || '',
                product['госреестр'] || '',
                product['для_малых_объектов'] || '',
                product['особенности'] || '',
                product['температура_мин'] || null,
                product['температура_макс'] || null,
                product.seo_title || product.title || '',
                product.seo_description || product.description || '',
                product.seo_keywords || product.category || '',
                product.createdAt || new Date().toISOString(),
                product.updatedAt || new Date().toISOString()
              ];

              if (isAsync) {
                await db.run(sql, params);
              } else {
                db.prepare(sql).run(...params);
              }
            }
            console.log(`[DB] Seeded ${products.length} products`);
          }
        } catch (e) {
          console.error('[DB] Error seeding products:', e.message);
        }
      }

      // Seed articles
      if (fs.existsSync(articlesJsonFile)) {
        try {
          const articles = JSON.parse(fs.readFileSync(articlesJsonFile, 'utf8'));
          if (Array.isArray(articles) && articles.length > 0) {
            for (const article of articles) {
              const sql = `
                INSERT OR REPLACE INTO articles (
                  id, category, title, excerpt, image, date, content, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const params = [
                article.id || `art-${Date.now()}-${Math.random()}`,
                article.category || '',
                article.title || '',
                article.excerpt || '',
                article.image || '',
                article.date || new Date().toISOString(),
                article.content || '',
                article.createdAt || new Date().toISOString(),
                article.updatedAt || new Date().toISOString()
              ];

              if (isAsync) {
                await db.run(sql, params);
              } else {
                db.prepare(sql).run(...params);
              }
            }
            console.log(`[DB] Seeded ${articles.length} articles`);
          }
        } catch (e) {
          console.error('[DB] Error seeding articles:', e.message);
        }
      }
    } else {
      console.log(`[DB] Database contains ${count} products`);
    }
  } catch (e) {
    console.error('[DB] Seeding error:', e.message);
  }
}

// Products API
async function getProducts(q) {
  try {
    let sql = 'SELECT * FROM products';
    let params = [];

    if (q && String(q).trim()) {
      const pattern = '%' + q.toLowerCase() + '%';
      sql = `SELECT * FROM products WHERE 
        LOWER(title) LIKE ? OR 
        LOWER(sku) LIKE ? OR 
        LOWER(category) LIKE ? OR 
        LOWER(description) LIKE ? 
        ORDER BY rowid DESC`;
      params = [pattern, pattern, pattern, pattern];
    } else {
      sql += ' ORDER BY rowid DESC';
    }

    let rows;
    if (isAsync) {
      rows = await db.all(sql, params);
    } else {
      rows = db.prepare(sql).all(...params);
    }

    return (rows || []).map(normalizeProductRow);
  } catch (e) {
    console.error('[DB] getProducts error:', e.message);
    return [];
  }
}

async function getProductById(id) {
  try {
    const sql = 'SELECT * FROM products WHERE id = ?';
    let row;
    if (isAsync) {
      row = await db.get(sql, [String(id)]);
    } else {
      row = db.prepare(sql).get(String(id));
    }
    return row ? normalizeProductRow(row) : null;
  } catch (e) {
    console.error('[DB] getProductById error:', e.message);
    return null;
  }
}

function normalizeProductRow(row) {
  if (!row) return row;
  try {
    row.photos = typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos || [];
  } catch (e) {
    row.photos = [];
  }
  return row;
}

// Articles API
async function getArticles(category) {
  try {
    let sql = 'SELECT * FROM articles';
    let params = [];

    if (category && String(category).trim()) {
      sql += ' WHERE LOWER(category) = LOWER(?)';
      params = [String(category)];
    }

    sql += ' ORDER BY date DESC';

    let rows;
    if (isAsync) {
      rows = await db.all(sql, params);
    } else {
      rows = db.prepare(sql).all(...params);
    }

    return rows || [];
  } catch (e) {
    console.error('[DB] getArticles error:', e.message);
    return [];
  }
}

async function getArticleById(id) {
  try {
    const sql = 'SELECT * FROM articles WHERE id = ?';
    let row;
    if (isAsync) {
      row = await db.get(sql, [String(id)]);
    } else {
      row = db.prepare(sql).get(String(id));
    }
    return row || null;
  } catch (e) {
    console.error('[DB] getArticleById error:', e.message);
    return null;
  }
}

// Export
module.exports = {
  init,
  getProducts,
  getProductById,
  getArticles,
  getArticleById,
  reinitFromJson: async function() {
    try {
      // Drop tables
      if (isAsync) {
        await db.run('DROP TABLE IF EXISTS products');
        await db.run('DROP TABLE IF EXISTS articles');
      } else {
        db.prepare('DROP TABLE IF EXISTS products').run();
        db.prepare('DROP TABLE IF EXISTS articles').run();
      }
      
      // Reinitialize
      await init();
      return { success: true, message: 'Database reinitialized' };
    } catch (e) {
      console.error('[DB] reinitFromJson error:', e.message);
      return { success: false, error: e.message };
    }
  }
};
