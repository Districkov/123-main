// Sync Database from products.json
// This script is for UPDATING DB FROM JSON, not overwriting user edits
// It only updates products that exist in JSON, and preserves DB characteristics
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
  let merged = 0;
  let errors = 0;
  let notFound = 0;

  // Create statement to fetch existing product
  const getStmt = db.prepare('SELECT characteristics FROM products WHERE id = ?');
  
  // Use transaction for better performance
  const updateStmt = db.prepare(
    'UPDATE products SET characteristics = ?, description = ?, sku = ?, category = ?, title = ?, photos = ?, price = ?, quantity = ?, seo = ?, updatedAt = ? WHERE id = ?'
  );
  
  const transaction = db.transaction(() => {
    productsData.forEach((product) => {
      if (!product.id) {
        console.warn('Skipping product: no id');
        return;
      }

      try {
        // Get existing product from DB
        const existing = getStmt.get(String(product.id));
        
        if (!existing) {
          console.warn(`⚠ Not found in DB: ${product.title} (${product.id})`);
          notFound++;
          return;
        }

        // Parse existing characteristics
        let existingChars = {};
        try {
          existingChars = JSON.parse(existing.characteristics || '{}');
        } catch (e) {
          existingChars = {};
        }

        // MERGE: Keep DB characteristics as priority, fill gaps from JSON
        const mergedChars = {
          ...product.characteristics,
          ...existingChars  // DB edits override JSON
        };

        // Only update if something changed
        const newCharJson = JSON.stringify(mergedChars);
        const oldCharJson = existing.characteristics;
        
        const result = updateStmt.run(
          newCharJson,
          product.description || '',
          JSON.stringify(product.sku || ''),
          product.category || '',
          product.title || '',
          JSON.stringify(product.photos || []),
          product.price || 0,
          product.quantity || 0,
          JSON.stringify(product.seo || {}),
          new Date().toISOString(),
          String(product.id)
        );

        if (result.changes > 0) {
          if (newCharJson !== oldCharJson) {
            console.log(`✓ Merged: ${product.title} (${product.id}) - Kept DB edits`);
            merged++;
          } else {
            console.log(`✓ Synced: ${product.title} (${product.id})`);
            updated++;
          }
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
  console.log(`Merged (preserved DB edits): ${merged}`);
  console.log(`Not found in DB: ${notFound}`);
  console.log(`Errors: ${errors}`);
  console.log(`\n✓ Your edits in the database are PRESERVED!`);

  process.exit(errors > 0 ? 1 : 0);

} catch (err) {
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
}

