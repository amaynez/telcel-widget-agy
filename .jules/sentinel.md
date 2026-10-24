## 2024-10-22 - [Secure Keychain Access]
**Vulnerability:** Weak default iOS Keychain access configuration. `SecItemAdd` was called without `kSecAttrAccessible`, which defaults to `kSecAttrAccessibleWhenUnlocked`. This can be overly permissive and does not prevent migration to a different device.
**Learning:** Default Keychain access controls do not prevent migration. While `kSecAttrSynchronizable` controls synchronization explicitly, setting `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` prevents migration to a different device (without claiming exclusion from every backup).
**Prevention:** Always explicitly define `kSecAttrAccessible` (like `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) when setting sensitive values like passwords to prevent unintended device migration.

## 2026-10-24 - [Constant-Time Array Comparison]
**Vulnerability:** Timing attack risk in magic byte verification. The `aesDecrypt` function used a fail-fast loop to verify the "Salted__" header, potentially allowing an attacker to deduce expected bytes via timing discrepancies.
**Learning:** Even for known public constants like "Salted__", security scanners and best practices flag fail-fast loops in cryptographic contexts as timing attack vectors. Accumulating differences via bitwise XOR (`mismatch |= buf[i] ^ expected[i]`) avoids branching and executes in constant time.
**Prevention:** Use constant-time comparison methods for all buffer and string equality checks in cryptographic functions, regardless of whether the expected value is a secret or a known constant.
