## 2024-10-22 - [Secure Keychain Access]
**Vulnerability:** Weak default iOS Keychain access configuration. `SecItemAdd` was called without `kSecAttrAccessible`, which defaults to `kSecAttrAccessibleWhenUnlocked`. This can be overly permissive and does not prevent migration to a different device.
**Learning:** Default Keychain access controls do not prevent migration. While `kSecAttrSynchronizable` controls synchronization explicitly, setting `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` prevents migration to a different device (without claiming exclusion from every backup).
**Prevention:** Always explicitly define `kSecAttrAccessible` (like `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) when setting sensitive values like passwords to prevent unintended device migration.

## 2026-10-24 - [Constant-Time Array Comparison]
**Vulnerability:** Defense-in-depth for magic byte verification. The `aesDecrypt` function used a fail-fast loop to verify the fixed public "Salted__" header. While timing differences here do not reveal a secret, security scanners flag fail-fast loops in cryptographic contexts.
**Learning:** Even for known public constants, using constant-time comparisons satisfies static analysis tools and acts as a defense-in-depth measure. Accumulating differences via bitwise XOR (`mismatch |= buf[i] ^ expected[i]`) avoids branching and executes in constant time.
**Prevention:** Use constant-time comparison methods for all buffer equality checks in cryptographic functions for scanner compliance and defense-in-depth.
## 2026-10-26 - [Guaranteed SSO Revocation in Swift]
**Vulnerability:** Telcel SSO token revocation in `fetchTelcelUsage` relied on manual calls at the end of `do` and `catch` blocks. Early exits, cancellations, or complex error handling paths could potentially bypass the revocation step, leading to session lockouts.
**Learning:** In Swift, unlike `finally` in JS, the most robust way to guarantee cleanup actions (like token revocation) upon exiting a scope is by using a `defer` block.
**Prevention:** Always use a `defer` block containing an unstructured `Task { }` to guarantee async cleanup actions (like network revocations) are executed regardless of how the function terminates.
