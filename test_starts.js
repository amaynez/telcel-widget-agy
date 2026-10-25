import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

globalThis.Color = globalThis.Color || class { constructor() {} };

const require = createRequire(import.meta.url);
const fs = require('fs');

let source = fs.readFileSync('./src/MiTelcelWidget.js', 'utf8');

// Replace regex with startsWith
source = source.replace(
  'const m = node.id.match(/^tabs-plans-v2-plan-name-(web-)?(\\d+-\\d+-\\d+)$/);\n      if (m) {\n        if (m[1]) webSuffixesSet.add(m[1] + m[2]);\n        else suffixesSet.add(m[2]);\n      }',
  `if (node.id.startsWith("tabs-plans-v2-plan-name-")) {
        const isWeb = node.id.startsWith("web-", 24);
        const sfx = node.id.slice(isWeb ? 28 : 24);
        if (sfx.indexOf("-") > 0) {
          if (isWeb) webSuffixesSet.add("web-" + sfx);
          else suffixesSet.add(sfx);
        }
      }`
);

fs.writeFileSync('./test_temp.js', source);
