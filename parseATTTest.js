import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

globalThis.Color = globalThis.Color || class { constructor() {} };

const { parseATTResponse } = require('./src/MiATTWidget.js');

const payload = {
  userBalances: [
    {
      ServicePlan: {
        ProductRatePlanName: "Plan 1",
        allowances: []
      }
    }
  ]
};

for (let i=0; i<1000; i++) {
  payload.userBalances[0].ServicePlan.allowances.push({
    AllowanceName: "Datos libre",
    UOM: "BYTES",
    TotalVolume: "10737418240", // 10 GB
    ConsumedVolume: "5368709120", // 5 GB
    EndDate: "2023-12-31T23:59:59Z"
  });
}

const payloadStr = JSON.stringify(payload);

let totalStr = 0;
let totalObj = 0;
const iterations = 50;

for(let i=0;i<3;i++) {
  parseATTResponse(payload);
  parseATTResponse(payloadStr);
}

for(let i=0;i<iterations;i++){
  let start = performance.now();
  parseATTResponse(payloadStr);
  totalStr += performance.now() - start;

  start = performance.now();
  parseATTResponse(payload);
  totalObj += performance.now() - start;
}

console.log("Str avg:", totalStr/iterations);
console.log("Obj avg:", totalObj/iterations);
