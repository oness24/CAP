const fs = require('fs');
const s = fs.readFileSync('tmp_wazuh_plugin.js', 'utf8');
const patterns = [
  /\/[0-9]+\/bundles\/plugin\/wazuh\/[^"'\s]+/g,
  /"[^"\n]*wazuh[^"\n]*\.js"/g,
  /"[0-9]+\.plugin\.js"/g,
  /__webpack_require__\.u\s*=\s*function\([^)]*\)/g,
  /webpackJsonp|webpackChunk|chunkId|installedChunks/g,
];
for (const p of patterns) {
  const m = s.match(p) || [];
  const unique = [...new Set(m)];
  console.log('PATTERN', p.toString(), 'COUNT', unique.length);
  for (const row of unique.slice(0, 40)) {
    console.log(row);
  }
  console.log('---');
}
