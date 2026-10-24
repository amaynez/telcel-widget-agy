
## 2024-05-18 - Replacing localeCompare with custom string/number split sorting in JavaScript
**Learning:** `String.prototype.localeCompare` with `{ numeric: true }` is extremely slow in V8 when sorting arrays dynamically in a hot path because it delegates to the underlying ICU localization libraries. In `parseTelcelResponse`, this was a major bottleneck taking >60ms on large mocked payloads.
**Action:** Replace `localeCompare({ numeric: true })` with a custom sorting function that splits strings (like "0-0-0") and iteratively compares parsed integer segments. This simple change reduces execution time by over 60% on heavy payloads.
