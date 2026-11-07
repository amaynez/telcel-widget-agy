# MiTelcelApp

## Overview
Native iOS container application (SwiftUI) for configuring mobile carrier credentials (`Telcel`, `Bait`, `AT&T`, and `Movistar`), previewing the `MiTelcelWidgetCardContent` 170x170 widget card and bucket breakdowns, and triggering manual usage refreshes and WidgetKit timeline reloads. Part of the root technical blueprint ([`../README_TECH.md`](../README_TECH.md)).

## Interface
- `[MiTelcelApp/MiTelcelApp.swift:MiTelcelApp]` `@main struct MiTelcelApp: App` (`var body: some Scene`)
- `[MiTelcelApp/MiTelcelApp.swift:ContentView]` `struct ContentView: View` (`init()`, `var body: some View`)

## Invariants
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.body]` Carrier picker and refresh button are disabled while `isLoading == true` (`.disabled(isLoading)`).
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.body]` Credential input fields vary by selected `MobileCarrier` case (`.telcel`: phone + password; `.bait`: phone only; `.att`: phone + password; `.movistar`: token `p_id` only).
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.body]` Footer text inside the 170x170 widget preview card is rendered only when `!entry.isError`, and the bucket breakdown list is rendered only when `!entry.buckets.isEmpty`.

## Side Effects
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.init]` Reads `TelcelNetworkService.selectedCarrier` and `TelcelNetworkService.loadCredentials(for: initialCarrier)` on initialization.
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.body]` On appear (`.onAppear`), asynchronously loads cached usage via `TelcelNetworkService.shared.loadCache(for: carrier)`.
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.switchCarrier]` Mutates `TelcelNetworkService.selectedCarrier`, reloads credentials via `TelcelNetworkService.loadCredentials(for: newCarrier)`, and loads cached entry via `TelcelNetworkService.shared.loadCache(for: newCarrier)` (falling back to `TelcelUsageEntry.sample(for: newCarrier)`).
- `[MiTelcelApp/MiTelcelApp.swift:ContentView.body]` Refresh button sets `TelcelNetworkService.selectedCarrier = carrier`, triggers network usage fetch via `TelcelNetworkService.shared.fetchUsage(carrier:forceRefresh:overridePhone:overridePassword:overrideToken:)`, reloads credentials via `TelcelNetworkService.loadCredentials(for: carrier)`, and calls `WidgetCenter.shared.reloadAllTimelines()`.

## Verification
- Run: `xcodebuild -project MiTelcelWidget.xcodeproj -scheme MiTelcelApp -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
