const fs = require('node:fs');
const p = 'v10/index.html';
let s = fs.readFileSync(p,'utf8');
const tag = '<script src="../demo/participant-history-view.js?v=review-20261101"></script>';
if (!s.includes(tag)) {
  if (!s.includes('</body>')) throw Error('HTML end missing');
  s=s.replace('</body>',tag+'\n</body>');
  fs.writeFileSync(p,s);
}
console.log('Participant read-only review linked:',s.includes(tag));
