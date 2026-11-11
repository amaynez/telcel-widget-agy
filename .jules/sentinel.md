## $(date +%Y-%m-%d) - [Strict Keychain Updates]
**Vulnerability:** Updating Keychain items using `SecItemUpdate` without explicitly specifying `kSecAttrAccessible` left the accessibility attribute unmanaged/inherited.
**Learning:** `SecItemUpdate` modifies only the attributes explicitly provided in `attrsToUpdate`. When a keychain item is updated, the intended strict accessibility attribute (e.g., `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) must be reaffirmed to prevent the OS from potentially relaxing access constraints upon update or failing to enforce strict access over the updated data.
**Prevention:** Always explicitly include `kSecAttrAccessible` in the `attrsToUpdate` dictionary when calling `SecItemUpdate`, even if it was specified during the original `SecItemAdd` call.
