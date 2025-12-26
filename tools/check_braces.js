const fs = require('fs');
const path = 'c:\\Users\\I_Solomin\\Desktop\\123-main\\frontend\\js\\catalog.js';
const lines = fs.readFileSync(path,'utf8').split(/\r?\n/);
let inClass = false;
let depth = 0;
for (let i=0;i<lines.length;i++){
  const l = lines[i];
  if (!inClass && /class\s+CatalogManager/.test(l)) { inClass = true; }
  if (inClass) {
    const opens = (l.match(/{/g) || []).length;
    const closes = (l.match(/}/g) || []).length;
    depth += opens - closes;
    if (depth <= 0) { console.log('Depth zero at line', i+1, ':', l); break; }
  }
}
console.log('done');
