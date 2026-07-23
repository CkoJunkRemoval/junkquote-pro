# JunkQuote Pro Capacitor v1.0

## Architecture

Capacitor is a thin native container around the production-hosted Next.js application. `CAPACITOR_SERVER_URL` must be the HTTPS production origin (default: `https://app.junkquote.pro`). The native projects do not contain a second application implementation. `native-shell/index.html` is only the connection-error fallback required by Capacitor.

Run `npm run cap:sync` after plugin/config/native-shell changes. Ordinary Next.js deployments update the hosted application without a native rebuild; native plugin, permission, icon, splash, bundle identifier, or native configuration changes require new store builds.

## Authentication and navigation

The WebView loads the production origin directly, preserving NextAuth cookies, CSRF handling, server actions, portal sessions, and tenant isolation. `junkquote://...` custom links work once installed. Verified `https://app.junkquote.pro/...` links additionally require:

- `https://app.junkquote.pro/.well-known/assetlinks.json` containing the final Android release signing certificate SHA-256 fingerprint.
- `https://app.junkquote.pro/.well-known/apple-app-site-association` containing the Apple Team ID and `com.junkquote.pro` application identifier.
- Production authentication and payment callback allowlists must use the HTTPS application origin. External links open in the system browser; owned return links route back into the app.

## Native capabilities

- Camera/photo picker: the field photo workspace uses `@capacitor/camera`; existing web file inputs remain the browser fallback. Android camera and iOS camera/photo usage declarations are configured.
- Downloads: PDF payloads are written to native cache and opened through the platform share/save sheet. Web downloads retain the anchor/blob implementation.
- Offline: the existing origin-scoped IndexedDB field queue is retained by the hosted WebView. Full SaaS data is not made offline.
- Push: the plugin and native permission declarations exist, but the app only reads permission state. It does not prompt, register, or create subscriptions. Android still needs Firebase `google-services.json`; iOS needs APNs entitlements, certificates/keys, and the Push Notifications capability; the server needs tenant-scoped token lifecycle and delivery handling.

## Release requirements

Android requires JDK 21, Android Studio/SDK 36, a private upload keystore, release signing configuration, Firebase configuration for push, verified app links, Play Console listing/privacy/data-safety declarations, screenshots/feature graphic, content rating, testing track, and current target-API compliance. Generate signed APK/AAB outside source control.

iOS requires macOS, current Xcode, an Apple Developer team, signing certificates/profiles, Associated Domains and Push Notifications capabilities, APNs configuration, privacy manifest/API declarations, App Store Connect listing/privacy nutrition labels, screenshots, review credentials, export-compliance answers, and physical-device camera/download/deep-link testing.

Store reviewers must be able to access meaningful native-integrated behavior. Apple payment rules need review before exposing purchases for digital features; JunkQuote customer invoice payments are payments for real-world services, but final store-review wording and flows should be confirmed.
