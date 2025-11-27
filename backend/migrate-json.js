const path = require('path');
const fs = require('fs');
const db = require('./db');

async function run() {
  try {
    db.init();
    console.log('DB initialized. Starting migration...');

    const dataDir = path.join(__dirname, 'data');
    const productsFile = path.join(dataDir, 'products.json');
    const articlesFile = path.join(dataDir, 'articles.json');

    // Clear existing tables
    db.deleteAllProducts();
    db.deleteAllArticles();
    console.log('Cleared existing products and articles.');

    // Import products
    let products = [];
    if (fs.existsSync(productsFile)) {
      try {
        products = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]');
      } catch (e) {
        console.error('Failed to parse products.json:', e.message || e);
      }
    }
    let pCount = 0;
    for (const p of products) {
      try {
        db.createProduct(p);
        pCount++;
      } catch (e) {
        console.warn('Skipping product import (error):', e.message || e);
      }
    }

    // Import articles
    let articles = [];
    if (fs.existsSync(articlesFile)) {
      try {
        articles = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
      } catch (e) {
        console.error('Failed to parse articles.json:', e.message || e);
      }
    }
    let aCount = 0;
    for (const a of articles) {
      try {
        db.createArticle(a);
        aCount++;
      } catch (e) {
        console.warn('Skipping article import (error):', e.message || e);
      }
    }

    console.log(`Migration complete. Products imported: ${pCount}, Articles imported: ${aCount}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
