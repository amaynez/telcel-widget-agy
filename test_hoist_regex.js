import { performance } from 'node:perf_hooks';

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

function parseTelcelResponseOld(payload) {
  const byId = {};
  const suffixesSet = new Set();
  const webSuffixesSet = new Set();
  const stack = [payload];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (typeof node.id === "string" && node.config) {
      byId[node.id] = node.config;
      const m = node.id.match(/^tabs-plans-v2-plan-name-(web-)?(\d+-\d+-\d+)$/);
      if (m) {
        if (m[1]) webSuffixesSet.add(m[1] + m[2]);
        else suffixesSet.add(m[2]);
      }
    }
    const children = node.children;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
    if (node.blocks) stack.push(node.blocks);
  }
  return { byId, suffixesSet };
}

function parseTelcelResponseNew(payload) {
  const byId = {};
  const suffixesSet = new Set();
  const webSuffixesSet = new Set();
  const stack = [payload];
  const rgx = /^tabs-plans-v2-plan-name-(web-)?(\d+-\d+-\d+)$/;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (typeof node.id === "string" && node.config) {
      byId[node.id] = node.config;
      const m = rgx.exec(node.id);
      if (m) {
        if (m[1]) webSuffixesSet.add(m[1] + m[2]);
        else suffixesSet.add(m[2]);
      }
    }
    const children = node.children;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
    if (node.blocks) stack.push(node.blocks);
  }
  return { byId, suffixesSet };
}

function parseTelcelResponseStartsWith(payload) {
  const byId = {};
  const suffixesSet = new Set();
  const webSuffixesSet = new Set();
  const stack = [payload];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (typeof node.id === "string" && node.config) {
      byId[node.id] = node.config;
      if (node.id.startsWith("tabs-plans-v2-plan-name-")) {
        const isWeb = node.id.startsWith("web-", 24);
        const sfx = node.id.slice(isWeb ? 28 : 24);
        // Basic format check to approximate regex (\d+-\d+-\d+)
        if (sfx.indexOf("-") > 0) {
          if (isWeb) webSuffixesSet.add("web-" + sfx);
          else suffixesSet.add(sfx);
        }
      }
    }
    const children = node.children;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
    if (node.blocks) stack.push(node.blocks);
  }
  return { byId, suffixesSet };
}

for (let i=0; i<3; i++) { parseTelcelResponseOld(payload); parseTelcelResponseNew(payload); parseTelcelResponseStartsWith(payload); }

let iterations = 25;
let tOld = 0;
for (let i=0; i<iterations; i++) {
  let s = performance.now();
  parseTelcelResponseOld(payload);
  tOld += performance.now() - s;
}

let tNew = 0;
for (let i=0; i<iterations; i++) {
  let s = performance.now();
  parseTelcelResponseNew(payload);
  tNew += performance.now() - s;
}

let tStarts = 0;
for (let i=0; i<iterations; i++) {
  let s = performance.now();
  parseTelcelResponseStartsWith(payload);
  tStarts += performance.now() - s;
}

console.log("Old (inline match):", (tOld/iterations).toFixed(4), "ms");
console.log("New (hoist exec):", (tNew/iterations).toFixed(4), "ms");
console.log("StartsWith:", (tStarts/iterations).toFixed(4), "ms");
