
## 2024-05-18 - Replacing localeCompare with custom string/number split sorting in JavaScript
**Learning:** `String.prototype.localeCompare` with `{ numeric: true }` is extremely slow in V8 when sorting arrays dynamically in a hot path because it delegates to the underlying ICU localization libraries. In `parseTelcelResponse`, this was a major bottleneck taking >60ms on large mocked payloads.
**Action:** Replace `localeCompare({ numeric: true })` with a custom sorting function that splits strings (like "0-0-0") and iteratively compares parsed integer segments. This simple change reduces execution time by over 60% on heavy payloads.

## 2026-10-26 - Validate suffix structure when using string slicing in JSON traversal
**Learning:** Replacing regex match extractions with `.slice(24)` and `.startsWith("web-")` eliminates capture-array allocations in JSON traversal, but omitting structure validation lets non-numeric nodes (`tabs-plans-v2-plan-name-header-info`) pollute `suffixesSet` and break web fallback.
**Action:** Pair fast prefix slicing with a hoisted `/^\d+-\d+-\d+$/` pattern check before adding suffixes to `suffixesSet` or `webSuffixesSet`.

## $(date +%Y-%m-%d) - Eliminate `.split()` overhead in sorting algorithm
**Learning:** Using `String.prototype.split()` within an `Array.sort()` comparator function creates thousands of short-lived array allocations, triggering significant Garbage Collection (GC) pressure. This easily pushes execution beyond the strict 30 MB / 15-second iOS limits.
**Action:** When parsing short delimiter-separated strings (like node suffixes), replace `.split()` calls with custom string parsing logic utilizing zero-allocation inline character evaluation (e.g., using `String.prototype.charCodeAt`).

## 2024-11-11 - Eliminate Regex and Higher-Order Array Functions in Telcel Parser
**Learning:** Using regular expressions (`/^\d+-\d+-\d+$/`) inside heavy JSON traversal loops (like `parseTelcelResponse`) and chained array methods (`.some()`, `.filter()`) significantly increases execution time and string/function allocations, risking iOS widget termination under the strict 15-second budget and 30 MB memory limit.
**Action:** Replace regular expressions on hot paths with zero-allocation manual string parsing (`.charCodeAt`) and replace chained higher-order array methods with standard `for` loops to minimize GC pressure.
