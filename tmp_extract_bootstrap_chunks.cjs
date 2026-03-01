const fs = require('fs');
const s = fs.readFileSync('tmp_wazuh_bootstrap.js', 'utf8');
const regexes = [
  /\/\d+\/bundles\/plugin\/wazuh\/[^"'\s]+/g,
  /'\/\d+\/bundles\/plugin\/wazuh\/[^']+'/g,
  /"\/\d+\/bundles\/plugin\/wazuh\/[^"]+"/g,
  /"\d+\.plugin\.js"/g,
  /'\d+\.plugin\.js'/g,
  /\b\d+\b:\s*\[[^\]]+\.js[^\]]*\]/g,
];
for (const r of regexes) {
  const arr = [...new Set((s.match(r) || []))];
  console.log('REGEX', r.toString(), 'COUNT', arr.length);
  for (const v of arr.slice(0, 80)) console.log(v);
  console.log('---');
}
