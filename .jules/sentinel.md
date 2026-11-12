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
**Prevention:** Always wrap critical cleanup logic (like token revocation) inside uncancelled tasks that are retained and awaited before scope exit in Swift, and guaranteed finally blocks in JS to ensure execution regardless of control flow.
## 2025-02-27 - Remove Plaintext Credential Storage in Widget Intents and UserDefaults
**Vulnerability:** Widget configuration intents (`TelcelWidgetConfigIntent`) were storing sensitive PII (`phone`) and credentials (`passwordOrToken`) as `@Parameter`s, which iOS stores in plaintext on disk. Additionally, `TelcelNetworkService` was caching the user's phone number into unencrypted `UserDefaults` (`sharedDefaults`).
**Learning:** It's common to accidentally leak PII/credentials when implementing configurable widgets if developers use the intent parameters for user authentication input instead of relying solely on the secure Keychain. Also, `UserDefaults` is unencrypted and should not hold PII.
**Prevention:** Never use `@Parameter` in `WidgetConfigurationIntent` for sensitive data. Always explicitly use the `Keychain` via `SecItemAdd` (with `kSecAttrAccessible`) for credentials and PII. Ensure any usage of `UserDefaults` for caching is actively audited and replaced with `.removeObject()` if PII is found.
## 2025-02-27 - [Defense-in-depth: Constant-Time Swift Byte Comparison]
**Vulnerability:** Defense-in-depth for magic byte verification in Swift. The `aesDecryptATT` function used string comparison (`String(data: magic, encoding: .ascii) == "Salted__"`) to verify the fixed public header. Security scanners flag non-constant-time comparisons in cryptographic contexts.
**Learning:** Even for known public constants, using constant-time comparisons satisfies static analysis tools and acts as a defense-in-depth measure. Accumulating differences via bitwise XOR avoids branching and string conversion overhead.
**Prevention:** Use a constant-time comparison loop (`mismatch |= magic[...] ^ expectedMagic[...]`) for all buffer equality checks in cryptographic functions for scanner compliance and defense-in-depth.

## 2025-02-12 - Detach SSO Token Revocation From the Fetch Task
**Vulnerability:** SSO token revocation was scheduled with a plain `Task { ... }` inside a `defer` block of an actor method.
**Learning:** An unstructured `Task {}` does NOT inherit the parent's cancellation (only child tasks and task groups do); it does inherit actor isolation, priority and task-locals. `Task.detached` drops those, so revocation no longer depends on the calling actor context. Treat this as hardening, not a confirmed cancellation bug.
**Prevention:** Use `Task.detached` for teardown work (HTTP token revocation) that must not depend on the caller's context, and await its `.value` before returning so it is not abandoned.

## 2026-11-12 - [Strict Keychain Updates]
**Vulnerability:** Updating Keychain items using `SecItemUpdate` without explicitly specifying `kSecAttrAccessible` left the accessibility attribute unmanaged/inherited.
**Learning:** `SecItemUpdate` modifies only the attributes explicitly provided in `attrsToUpdate`. When a keychain item is updated, the intended strict accessibility attribute (e.g., `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) must be reaffirmed to prevent the OS from potentially relaxing access constraints upon update or failing to enforce strict access over the updated data.
**Prevention:** Always explicitly include `kSecAttrAccessible` in the `attrsToUpdate` dictionary when calling `SecItemUpdate`, even if it was specified during the original `SecItemAdd` call.
