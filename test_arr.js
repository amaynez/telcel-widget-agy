const byId = {};
for (let i = 0; i < 1000; i++) {
  byId[`tabs-plans-v2-used-data-value-0-${i}-0`] = { value: "50" };
  byId[`tabs-plans-v2-used-data-unit-0-${i}-0`] = { value: "MB" };
}

const sfxs = [];
for (let i = 0; i < 1000; i++) sfxs.push(`0-${i}-0`);

console.time("arr1");
let sum = 0;
for (let k = 0; k < 100; k++) {
  for (let i = 0; i < sfxs.length; i++) {
    const sfx = sfxs[i];
    sum += Number(byId[`tabs-plans-v2-used-data-value-${sfx}`]?.value) || 0;
  }
}
console.timeEnd("arr1");
