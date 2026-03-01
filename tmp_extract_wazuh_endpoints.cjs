const fs = require('fs');
const s = fs.readFileSync('tmp_wazuh_plugin.js', 'utf8');
const re = /apiReq\(\s*"(GET|POST|PUT|DELETE)"\s*,\s*"([^"]+)"/g;
const set = new Set();
let m;
while ((m = re.exec(s)) !== null) {
  set.add(`${m[1]} ${m[2]}`);
}
console.log('count', set.size);
for (const row of [...set].sort()) {
  console.log(row);
}
