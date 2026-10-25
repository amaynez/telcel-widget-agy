import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fs = require('fs');

globalThis.Color = globalThis.Color || class { constructor() {} };

function generatePayload(depth, breadth) {
  let currentId = 0;
  function createNode(d) {
    if (d === 0) {
      const idStr = `tabs-plans-v2-plan-name-0-${currentId++}-0`;
      const dataValId = `tabs-plans-v2-total-data-value-0-${currentId-1}-0`;
      const dataUnitId = `tabs-plans-v2-total-data-unit-0-${currentId-1}-0`;
      return {
        id: `wrapper-${currentId-1}`,
        children: [
          { id: idStr, config: { value: `Plan ${idStr}` } },
          { id: dataValId, config: { value: "10" } },
          { id: dataUnitId, config: { value: "GB" } }
        ]
      };
    }
    const children = [];
    for (let i = 0; i < breadth; i++) {
      children.push(createNode(d - 1));
    }
    return { id: `node-${d}`, config: {}, children };
  }
  const baseNode = {
    children: [
      { id: "tabs-plans-v2-plan-name-0-0-0", config: { value: "Base" } },
      { id: "tabs-plans-v2-total-data-value-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-0-0-0", config: { value: "GB" } }
    ]
  };
  return { blocks: { children: [baseNode, createNode(depth)] } };
}

const payload = generatePayload(6, 4);

let source = fs.readFileSync('./src/MiTelcelWidget.js', 'utf8');

// Replace regex with native string operations (which was proven faster above and bypasses RegEx allocation/compilation)
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

fs.writeFileSync('./test_temp_telcel_2.js', source);

const { parseTelcelResponse } = require("./src/MiTelcelWidget.js");
const { parseTelcelResponse: parseTelcelResponseFast } = require("./test_temp_telcel_2.js");

let totalOld = 0;
let totalFast = 0;
const iterations = 50;

// Warmup
for(let i=0; i<3; i++) { parseTelcelResponse(payload); parseTelcelResponseFast(payload); }

for (let i=0; i<iterations; i++) {
  let s = performance.now();
  parseTelcelResponse(payload);
  totalOld += performance.now() - s;

  s = performance.now();
  parseTelcelResponseFast(payload);
  totalFast += performance.now() - s;
}

console.log("Old avg:", totalOld / iterations);
console.log("Fast avg:", totalFast / iterations);
