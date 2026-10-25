const regex = /^tabs-plans-v2-plan-name-(web-)?(\d+-\d+-\d+)$/;

console.time("regex");
for(let i=0; i<100000; i++) {
  regex.exec("tabs-plans-v2-plan-name-web-0-0-0");
}
console.timeEnd("regex");

console.time("startsWith");
for(let i=0; i<100000; i++) {
  let id = "tabs-plans-v2-plan-name-web-0-0-0";
  if (id.startsWith("tabs-plans-v2-plan-name-")) {
    const isWeb = id.startsWith("web-", 24);
    const sfx = id.slice(isWeb ? 28 : 24);
    if (sfx.indexOf("-") > 0) {
      // equivalent check
    }
  }
}
console.timeEnd("startsWith");
