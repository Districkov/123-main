// Sync Database from products.json
// This script updates the SQLite database with data from products.json
// Usage: node sync-db.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
  const dbPath = path.join(__dirname, 'data', 'app.db');
  const db = new Database(dbPath);
  
  console.log('Connected to database at:', dbPath);

  const productsJsonPath = path.join(__dirname, 'data', 'products.json');
  
  if (!fs.existsSync(productsJsonPath)) {
    console.error('ERROR: products.json not found at:', productsJsonPath);
    process.exit(1);
  }

  const productsData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  console.log(`Read ${productsData.length} products from products.json`);

  let updated = 0;
  let errors = 0;
  let notFound = 0;

  // Use transaction for better performance
  const updateStmt = db.prepare(
    'UPDATE products SET characteristics = ?, description = ? WHERE id = ?'
  );
  const transaction = db.transaction(() => {
    productsData.forEach((product) => {
      if (!product.id) {
        console.warn('Skipping product: no id');
        return;
      }

      try {
        const characteristics = JSON.stringify(product.characteristics || {});
        const description = product.description || '';

        const result = updateStmt.run(
          characteristics,
          description,
          String(product.id)
        );

        if (result.changes > 0) {
          console.log(`✓ Updated: ${product.title} (${product.id})`);
          updated++;
        } else {
          console.warn(`⚠ Not found in DB: ${product.title} (${product.id})`);
          notFound++;
        }
      } catch (e) {
        console.error(`✗ Error updating ${product.id}:`, e.message);
        errors++;
      }
    });
  });

  // Execute transaction
  transaction();
  
  db.close();

  console.log(`\n=== Sync Complete ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found in DB: ${notFound}`);
  console.log(`Errors: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);

} catch (err) {
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
}

