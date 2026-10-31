import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

// Polyfill minimal globals needed to import MiTelcelWidget in Node
globalThis.Color = globalThis.Color || class { constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha; } };

const require = createRequire(import.meta.url);
const { parseTelcelResponse } = require("../src/MiTelcelWidget.js");

// Generate a large synthetic payload (4^6 = 4096 leaf nodes)
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

for (let i = 0; i < 3; i++) parseTelcelResponse(payload);

const iterations = 25;
let totalTime = 0;
for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  parseTelcelResponse(payload);
  totalTime += performance.now() - start;
}

const avgTime = totalTime / iterations;
console.log(`Average time over ${iterations} iterations: ${avgTime.toFixed(4)} ms`);
assert.ok(avgTime < 50, `Telcel parser performance regression: ${avgTime.toFixed(2)}ms exceeds budget (50ms)`);
