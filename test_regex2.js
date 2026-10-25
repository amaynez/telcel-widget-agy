const prefix = "tabs-plans-v2-";
const ids = [];
for (let i=0; i<10000; i++) {
  ids.push(`${prefix}plan-name-web-0-${i}-0`);
  ids.push(`${prefix}total-data-value-0-${i}-0`);
}

console.time("startsWith-fast");
let count = 0;
for (let i=0; i<100; i++) {
  for (const id of ids) {
    if (id.startsWith("tabs-plans-v2-")) {
      if (id.startsWith("plan-name-", 14)) {
         let isWeb = id.startsWith("web-", 24);
         let sfx = id.slice(isWeb ? 28 : 24);
         count++;
      }
    }
  }
}
console.timeEnd("startsWith-fast");
