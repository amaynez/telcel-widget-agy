## 2024-05-14 - Mejoras en Estados de Error y Configuración en Widgets de Consumo

**Learning:** When users encounter an unconfigured or disconnected widget, plain textual errors ("Sin datos. Verificar credenciales o red.") can feel jarring and unhelpful. Including actionable verbs (e.g., "Toca el widget para...") and a familiar warning icon (⚠️) instantly transforms an error screen into a helpful prompt, reducing perceived friction. Similarly, during initial setup, explicitly stating *why* permissions/credentials are needed ("Para mostrar tu consumo en vivo...") provides reassuring context compared to solely focusing on the mechanism ("Tus credenciales se guardarán en el Keychain").

**Action:** Always ensure empty or error states have visual weight (icons, layout adjustments) and actionable, user-centric copy rather than purely technical explanations, across both JS Scriptable and Native SwiftUI widget targets.

## 2024-10-22 - Optimización de Entrada de Datos con Teclados Contextuales

**Learning:** During widget setup or authentication flows on iOS, requiring users to manually switch to the numeric keyboard to input a phone number creates unnecessary friction and cognitive load. This is a common oversight in form design on mobile devices. Providing the correct context (e.g., a phone pad) for specific input fields drastically improves the setup UX, making it feel native and intuitive.

**Action:** Always utilize appropriate contextual keyboards (e.g., `setPhonePadKeyboard()`, `setEmailAddressKeyboard()`) for text fields in Scriptable alerts (and equivalent SwiftUI components) to minimize user effort and prevent formatting errors during data entry.

## 2026-10-23 - Optimización de Entrada de Datos con OS-Level Autofill en SwiftUI

**Learning:** While using specific keyboard types (like number pads) is a great start for data entry on mobile devices, users still have to manually type their credentials if the OS doesn't recognize what type of data is being asked for. Adding explicit content types to form fields (`.textContentType` in SwiftUI) acts as a semantic hint that can improve autofill suggestions and reduce manual entry. Note that it does not guarantee a single-tap completion, as Password AutoFill depends on correctly typed login fields (e.g. using `.username`), saved credentials in iCloud Keychain, device settings, and associated domains where relevant.

**Action:** Always complement specific keyboard types with appropriate `.textContentType` modifiers (e.g., `.telephoneNumber`, `.username`, `.password`, `.emailAddress`) in SwiftUI forms (and their equivalents in HTML/other frameworks) to act as semantic hints for OS-level autofill, which can significantly reduce friction during authentication or setup flows.

## 2026-10-25 - Agrupación Semántica para VoiceOver en Widgets SwiftUI

**Learning:** When building small, information-dense components like iOS Widgets, VoiceOver can read every individual `Text`, `Image`, or shape separately. This results in a disjointed, verbose, and confusing experience for screen reader users, who have to swipe through multiple elements just to understand the overall status of a single card.
**Action:** Always use `.accessibilityElement(children: .ignore)` on container views (like `VStack` or `HStack`) that represent a unified concept when providing a custom `.accessibilityLabel` that summarizes the entire content logically, preventing VoiceOver from reading fragmented or redundant child views.

## 2026-10-26 - Prevención de Autocorrección en Entradas Numéricas/Credenciales

**Learning:** Even with contextual keyboards like `numberPad` and semantic AutoFill hints like `.textContentType(.username)` or `.telephoneNumber`, the OS may sometimes still attempt to autocorrect or suggest replacements for numeric inputs like phone numbers or account IDs. This can lead to silent errors where users submit incorrectly formatted or mangled numbers during login or configuration.

**Action:** Always explicitly attach `.autocorrectionDisabled()` (in SwiftUI) or its equivalent (e.g., `autocorrect="off"` in HTML) to input fields meant for exact identifiers (like phone numbers, tokens, or usernames) to help prevent autocorrection and reduce unwanted OS-level text replacement behaviors.

## 2026-10-27 - Consistencia de AutoFill para Identificadores de Cuenta en SwiftUI

**Learning:** When using phone numbers as login identifiers alongside password managers and iCloud Keychain, using `.textContentType(.telephoneNumber)` can prevent the OS credential manager from properly recognizing and associating the account identifier with saved credentials. Using `.textContentType(.username)` for phone-based account identifiers ensures consistent AutoFill behavior across all carrier login inputs.

**Action:** Use `.textContentType(.username)` instead of `.telephoneNumber` for phone input fields that serve as account login identifiers to ensure seamless Keychain AutoFill integration.

## 2026-10-28 - Unificación Semántica para VoiceOver y Consistencia de AutoFill

**Learning:** The lack of contextual `.textContentType` and `.autocorrectionDisabled()` on token fields like Movistar's `p_id` causes friction since it misses AutoFill hints and OS text corrections. Similarly, complex loop views like data buckets are read disjointedly by VoiceOver unless combined.
**Action:** Always complement token inputs with appropriate `.textContentType` and `.autocorrectionDisabled()`, and use `.accessibilityElement(children: .combine)` on repetitive bucket `VStack` elements to maintain a unified and frictionless a11y experience.
