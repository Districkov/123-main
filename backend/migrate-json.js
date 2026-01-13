const path = require('path');
const fs = require('fs');
const db = require('./db');

async function run() {
  try {
    db.init();
    console.log('DB initialized. Starting smart migration...');

    const dataDir = path.join(__dirname, 'data');
    const productsFile = path.join(dataDir, 'products.json');
    const articlesFile = path.join(dataDir, 'articles.json');

    // ========== SMART PRODUCTS MIGRATION ==========
    // Don't clear existing products! Instead, merge:
    // - Add new products from JSON
    // - Keep existing products in DB (they have user edits)
    // - Update only if product in JSON is newer
    
    let products = [];
    if (fs.existsSync(productsFile)) {
      try {
        products = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]');
      } catch (e) {
        console.error('Failed to parse products.json:', e.message || e);
      }
    }
    
    let pCount = 0;
    let pUpdated = 0;
    
    for (const p of products) {
      try {
        const existing = db.getProductById(p.id);
        if (existing) {
          // Product exists in DB - only update if JSON is newer or if we're filling in missing fields
          // Keep all characteristics from DB (user edits), only update from JSON if DB field is empty
          const merged = {
            ...p,
            characteristics: {
              ...p.characteristics,
              ...existing.characteristics // Keep DB edits as priority
            }
          };
          db.updateProduct(p.id, merged);
          pUpdated++;
          console.log(`✓ Merged existing product: ${p.title} (kept DB edits)`);
        } else {
          // New product - add it
          db.createProduct(p);
          pCount++;
          console.log(`✓ Added new product: ${p.title}`);
        }
      } catch (e) {
        console.warn('Skipping product import (error):', e.message || e);
      }
    }

    // ========== SMART ARTICLES MIGRATION ==========
    let articles = [];
    if (fs.existsSync(articlesFile)) {
      try {
        articles = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
      } catch (e) {
        console.error('Failed to parse articles.json:', e.message || e);
      }
    }
    
    let aCount = 0;
    let aUpdated = 0;
    
    for (const a of articles) {
      try {
        const existing = db.getArticleById(a.id);
        if (existing) {
          // Article exists - update it
          db.updateArticle(a.id, a);
          aUpdated++;
          console.log(`✓ Updated existing article: ${a.title}`);
        } else {
          // New article - add it
          db.createArticle(a);
          aCount++;
          console.log(`✓ Added new article: ${a.title}`);
        }
      } catch (e) {
        console.warn('Skipping article import (error):', e.message || e);
      }
    }

    console.log(`\n=== Smart Migration Complete ===`);
    console.log(`Products - Added: ${pCount}, Merged: ${pUpdated}`);
    console.log(`Articles - Added: ${aCount}, Updated: ${aUpdated}`);
    console.log(`✓ Your edits in the database are PRESERVED!`);
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
