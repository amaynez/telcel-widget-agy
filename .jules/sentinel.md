## 2024-10-22 - [Secure Keychain Access]
**Vulnerability:** Weak default iOS Keychain access configuration. `SecItemAdd` was called without `kSecAttrAccessible`, which defaults to `kSecAttrAccessibleWhenUnlocked`. This can be overly permissive and does not prevent migration to a different device.
**Learning:** Default Keychain access controls do not prevent migration. While `kSecAttrSynchronizable` controls synchronization explicitly, setting `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` prevents migration to a different device (without claiming exclusion from every backup).
**Prevention:** Always explicitly define `kSecAttrAccessible` (like `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) when setting sensitive values like passwords to prevent unintended device migration.

## 2024-10-23 - [Weak Cryptographic Salt Fallback]
**Vulnerability:** In `src/MiATTWidget.js`, when a secure random number generator is unavailable (`crypto.getRandomValues`), the script relied solely on `Math.random()` to generate an 8-byte salt for AES-256-CBC encryption.
**Learning:** `Math.random()` is not cryptographically secure and can generate predictable values. In constrained widget environments like Scriptable, `getRandomValues` might not exist, but other WebCrypto methods like `randomUUID` might.
**Prevention:** When falling back from ideal cryptographic primitives, always check for intermediate, better-than-nothing secure generators (e.g., `crypto.randomUUID()`) before resorting to highly predictable fallbacks like `Math.random()`.
