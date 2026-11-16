// Builds components/symbols-map.json (icon name -> codepoint) from the Material Symbols codepoints file.
// Run: node scripts/gen-symbols.js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'assets', 'fonts', 'symbols.codepoints');
const map = {};
fs.readFileSync(src, 'utf8').split('\n').forEach((line) => {
  const [name, hex] = line.trim().split(' ');
  if (name && hex) map[name] = parseInt(hex, 16);
});
fs.writeFileSync(path.join(__dirname, '..', 'components', 'symbols-map.json'), JSON.stringify(map));
console.log(Object.keys(map).length, 'symbols');
