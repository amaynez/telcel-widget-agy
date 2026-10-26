
## 2024-05-18 - Replacing localeCompare with custom string/number split sorting in JavaScript
**Learning:** `String.prototype.localeCompare` with `{ numeric: true }` is extremely slow in V8 when sorting arrays dynamically in a hot path because it delegates to the underlying ICU localization libraries. In `parseTelcelResponse`, this was a major bottleneck taking >60ms on large mocked payloads.
**Action:** Replace `localeCompare({ numeric: true })` with a custom sorting function that splits strings (like "0-0-0") and iteratively compares parsed integer segments. This simple change reduces execution time by over 60% on heavy payloads.

## 2026-10-26 - Validate suffix structure when using string slicing in JSON traversal
**Learning:** Replacing regex match extractions with `.slice(24)` and `.startsWith("web-")` eliminates capture-array allocations in JSON traversal, but omitting structure validation lets non-numeric nodes (`tabs-plans-v2-plan-name-header-info`) pollute `suffixesSet` and break web fallback.
**Action:** Pair fast prefix slicing with a hoisted `/^\d+-\d+-\d+$/` pattern check before adding suffixes to `suffixesSet` or `webSuffixesSet`.
