const ids = [];
for (let i=0; i<10000; i++) {
  ids.push(`tabs-plans-v2-plan-name-web-0-${i}-0`);
  ids.push(`tabs-plans-v2-total-data-value-0-${i}-0`);
}

console.time("regex");
let regexCount = 0;
for (let i=0; i<100; i++) {
  for (const id of ids) {
    const m = id.match(/^tabs-plans-v2-plan-name-(web-)?(\d+-\d+-\d+)$/);
    if (m) regexCount++;
  }
}
console.timeEnd("regex");

console.time("startsWith");
let strCount = 0;
for (let i=0; i<100; i++) {
  for (const id of ids) {
    if (id.startsWith("tabs-plans-v2-plan-name-")) {
      const rest = id.slice(24);
      strCount++;
    }
  }
}
console.timeEnd("startsWith");
console.log(regexCount, strCount);
