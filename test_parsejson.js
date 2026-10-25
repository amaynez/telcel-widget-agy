import { performance } from 'node:perf_hooks';

const payload = JSON.stringify({
  a: 1, b: 2, c: 3,
  nested: {
    d: 4, e: 5, f: 6, g: "string", h: true,
    arr: [1, 2, 3, 4, 5, { foo: "bar" }, { foo: "baz" }]
  }
});

let tOld = 0;
let tNew = 0;
const iterations = 100000;

for (let i=0; i<iterations; i++) {
  let s = performance.now();
  let obj1 = JSON.parse(payload);
  tOld += performance.now() - s;

  s = performance.now();
  let obj2 = typeof payload === "string" ? JSON.parse(payload) : payload;
  tNew += performance.now() - s;
}

console.log("Old avg:", totalOld / iterations);
console.log("New avg:", totalNew / iterations);
