import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const fs = req('fs');

const attCode = fs.readFileSync('./src/MiATTWidget.js', 'utf8');

// just run performance check on ATT parser to see if any of it is a bottleneck
