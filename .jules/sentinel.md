## 2024-10-22 - [Secure Keychain Access]
**Vulnerability:** Weak default iOS Keychain access configuration. `SecItemAdd` was called without `kSecAttrAccessible`, which defaults to `kSecAttrAccessibleWhenUnlocked`. This can be overly permissive and does not prevent migration to a different device.
**Learning:** Default Keychain access controls do not prevent migration. While `kSecAttrSynchronizable` controls synchronization explicitly, setting `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` prevents migration to a different device (without claiming exclusion from every backup).
**Prevention:** Always explicitly define `kSecAttrAccessible` (like `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) when setting sensitive values like passwords to prevent unintended device migration.

## 2026-10-24 - [Constant-Time Array Comparison]
**Vulnerability:** Defense-in-depth for magic byte verification. The `aesDecrypt` function used a fail-fast loop to verify the fixed public "Salted__" header. While timing differences here do not reveal a secret, security scanners flag fail-fast loops in cryptographic contexts.
**Learning:** Even for known public constants, using constant-time comparisons satisfies static analysis tools and acts as a defense-in-depth measure. Accumulating differences via bitwise XOR (`mismatch |= buf[i] ^ expected[i]`) avoids branching and executes in constant time.
**Prevention:** Use constant-time comparison methods for all buffer equality checks in cryptographic functions for scanner compliance and defense-in-depth.
## 2026-10-26 - [Guaranteed SSO Revocation in Swift]
**Vulnerability:** Telcel SSO token revocation in `fetchTelcelUsage` can be bypassed by early exits or errors if cleanup is scattered. Using an unawaited background `Task` inside a synchronous `defer` block risks premature process suspension before revocation completes, causing session lockouts.
**Learning:** In Swift async functions where synchronous `defer` cannot await async calls, capturing the outcome in a `Result` allows guaranteed, strictly awaited asynchronous cleanup before returning or throwing.
**Prevention:** Use a `do ... catch` structure resolving to a `Result<T, Error>`, await the async cleanup routine (e.g., `revokeSSOToken`), and then `return try result.get()`.
## 2026-10-28 - [SSO Token Revocation Consistency]
**Vulnerability:** SSO tokens for Telcel were being revoked sequentially, leading to potential session lockouts if the execution was cancelled before the request finished.
**Learning:** In Swift, `await` inside a sequential flow makes the code vulnerable to parent task cancellation. In JS, sequential execution after async calls can be interrupted if the function throws or exits early.
**Prevention:** Always wrap critical cleanup logic (like token revocation) inside uncancelled tasks (e.g. `defer { Task { ... } }` in Swift) and guaranteed finally blocks (e.g. `finally { ... }` in JS) to ensure execution regardless of control flow.
