import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

globalThis.Color = globalThis.Color || class { constructor() {} };

const fs = require('fs');

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
const sourceOriginal = fs.readFileSync('./src/MiTelcelWidget.js', 'utf8');

const replacement1 = `if (node.id.startsWith("tabs-plans-v2-plan-name-")) {
        const isWeb = node.id.startsWith("web-", 24);
        const sfx = node.id.slice(isWeb ? 28 : 24);
        if (sfx.indexOf("-") > 0) {
          if (isWeb) webSuffixesSet.add("web-" + sfx);
          else suffixesSet.add(sfx);
        }
      }`;

const sourceMod1 = sourceOriginal.replace(
  'const m = node.id.match(/^tabs-plans-v2-plan-name-(web-)?(\\d+-\\d+-\\d+)$/);\n      if (m) {\n        if (m[1]) webSuffixesSet.add(m[1] + m[2]);\n        else suffixesSet.add(m[2]);\n      }',
  replacement1
);
fs.writeFileSync('./mod1.js', sourceMod1);


const { parseTelcelResponse: orig } = require('./src/MiTelcelWidget.js');
const { parseTelcelResponse: mod1 } = require('./mod1.js');

let t0 = 0, t1 = 0;
const iterations = 50;

for(let i=0;i<3;i++){orig(payload);mod1(payload);}

for(let i=0;i<iterations;i++){
  let start = performance.now();
  orig(payload);
  t0 += performance.now() - start;

  start = performance.now();
  mod1(payload);
  t1 += performance.now() - start;
}

console.log("Original avg:", t0/iterations);
console.log("Mod1 avg:", t1/iterations);
