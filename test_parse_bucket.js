const byId = {};
for (let i = 0; i < 1000; i++) {
  byId[`tabs-plans-v2-used-data-value-${i}`] = { value: "50" };
  byId[`tabs-plans-v2-used-data-unit-${i}`] = { value: "MB" };
  byId[`tabs-plans-v2-total-data-value-${i}`] = { value: "100" };
  byId[`tabs-plans-v2-total-data-unit-${i}`] = { value: "MB" };
  byId[`tabs-plans-v2-available-data-value-${i}`] = { value: "50" };
  byId[`tabs-plans-v2-available-data-unit-${i}`] = { value: "MB" };
}

const sfxs = [];
for (let i = 0; i < 1000; i++) sfxs.push(`${i}`);

console.time("toMB_call");

  const toMB = (val, unit) => {
    if (val === undefined || val === null || val === "") return null;
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    const u = String(unit || "").toUpperCase();
    if (u === "GB") return n * 1000;
    if (u === "KB") return n / 1024;
    return n;
  };

for (let k = 0; k < 100; k++) {
  for (let i = 0; i < sfxs.length; i++) {
    const sfx = sfxs[i];
    const uMB = toMB(
      byId[`tabs-plans-v2-used-data-value-${sfx}`]?.value,
      byId[`tabs-plans-v2-used-data-unit-${sfx}`]?.value
    );
  }
}
console.timeEnd("toMB_call");
