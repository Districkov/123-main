const fs=require('fs');
const lines=fs.readFileSync('c:\\Users\\I_Solomin\\Desktop\\123-main\\frontend\\js\\catalog.js','utf8').split(/\r?\n/);
const upto=354;
const s=lines.slice(0,upto).join('\n');
console.log('backticks:', (s.match(/`/g)||[]).length);
console.log('single quotes:', (s.match(/'/g)||[]).length);
console.log('double quotes:', (s.match(/"/g)||[]).length);
