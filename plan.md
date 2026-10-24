1. **Analyze the performance issue**: `node tests/test_performance.mjs` was throwing an AssertionError because the execution time for `parseTelcelResponse` on large payloads was around 60ms, which exceeded the 50ms budget.
2. **Identify the bottleneck**: I determined that sorting the extracted `suffixes` array was the problem. The codebase was using `Array.from(activeSuffixes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))`. `String.prototype.localeCompare` is notoriously slow when sorting dynamically in V8 due to ICU localization overhead.
3. **Optimize the sort**: Replace `localeCompare` with a custom sorting function. Given the suffixes take the format like `"0-0-0"`, we can simply split by `"-"` and compare each part numerically. This is significantly faster.
4. **Implement across platforms**:
   - Update `src/MiTelcelWidget.js`
   - Update `android/mitelcel_widget.mjs` (it had already been copied)
   - Update `MiTelcelWidget/TelcelNetworkService.swift` which uses `localizedStandardCompare` to keep logic in sync across JS/Swift (per agent memory constraints).
5. **Verify**: Run tests using `node tests/test_performance.mjs` and `node tests/test_parser.mjs` to ensure the performance is <50ms and that parser functionality remains perfectly correct.
6. **Pre-commit**: Complete the standard `pre_commit_instructions` steps before submission.
