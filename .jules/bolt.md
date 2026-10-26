
## 2024-05-18 - Replacing localeCompare with custom string/number split sorting in JavaScript
**Learning:** `String.prototype.localeCompare` with `{ numeric: true }` is extremely slow in V8 when sorting arrays dynamically in a hot path because it delegates to the underlying ICU localization libraries. In `parseTelcelResponse`, this was a major bottleneck taking >60ms on large mocked payloads.
**Action:** Replace `localeCompare({ numeric: true })` with a custom sorting function that splits strings (like "0-0-0") and iteratively compares parsed integer segments. This simple change reduces execution time by over 60% on heavy payloads.

## 2024-05-18 - Avoid Regex allocations in hot loops for parser traversal
**Learning:** Instantiating and executing `RegExp.exec()` repeatedly within the main parser stack traversal loop creates excessive short-lived string and regex object allocations. This contributes to memory pressure and reduces execution speed, which can push iOS widgets over their 30MB RAM limit and strict execution timeouts.
**Action:** Replace `Regex.exec()` within hot loops with simpler native string methods like `.startsWith` and `.slice`. For example, `node.id.slice(24)` is much faster for checking known fixed-length string prefixes.
