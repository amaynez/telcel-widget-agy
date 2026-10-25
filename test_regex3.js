const prefix = "tabs-plans-v2-";
const ids = [];
for (let i=0; i<10000; i++) {
  ids.push(`${prefix}plan-name-web-0-${i}-0`);
  ids.push(`${prefix}total-data-value-0-${i}-0`);
}

const rgx = /^tabs-plans-v2-plan-name-(web-)?(\d+-\d+-\d+)$/;

console.time("regex-hoist");
let count = 0;
for (let i=0; i<100; i++) {
  for (const id of ids) {
    const m = rgx.exec(id);
    if (m) count++;
  }
}
console.timeEnd("regex-hoist");
