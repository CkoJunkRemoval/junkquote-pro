# JunkQuote Pro PWA v1.0

The app uses Next.js App Router metadata and a first-party service worker served at `/sw.js`. No PWA package is required. The worker is enabled in production, or locally only when `NEXT_PUBLIC_ENABLE_LOCAL_PWA=true` is set.

## Runtime cache policy

- Cache-first after first fetch: same-origin `/_next/static/`, `/icons/`, `/favicon.ico`, and `/manifest.webmanifest`. A response is cached only when it is successful, non-redirected, has no `Set-Cookie`, and is not marked `private` or `no-store`.
- Network-only: all API and server-action traffic; authenticated, portal, approval, billing, payment, field, dashboard, settings, admin, analytics, and operational routes; requests carrying `Authorization`; all cross-origin traffic; all non-GET traffic.
- Navigations always use the network. A failed navigation receives only the static `/offline` page. Authenticated HTML is never put in Cache Storage.
- Activation deletes older `junkquote-pwa-*` caches. A waiting worker is activated only after the user chooses **Reload**.
- Sign-out asks the active worker to delete its public asset caches. The field photo IndexedDB remains tenant/user scoped so an interrupted upload is not silently destroyed; it is never rendered by the offline shell without authentication.

## Recovery and releases

Cache names use `VERCEL_GIT_COMMIT_SHA` (or `NEXT_PUBLIC_APP_VERSION`). `/sw.js` is served with `no-store` and `updateViaCache: none`. For recovery, browser site settings can unregister the worker; application code can also call `registration.unregister()` and clear caches before a redeploy.

## Push groundwork

The worker has `push` and `notificationclick` handlers and validates notification destinations as same-origin. The app does not request permission or create subscriptions. A future release needs a VAPID key pair, provider/storage design, authenticated subscription lifecycle, revocation, tenant scoping, and delivery monitoring. Email remains authoritative.

## Capacitor follow-up

Recommended identifiers are `com.junkquote.pro` for both the Android package and iOS bundle. Before wrapping, decide hosted-web versus bundled-web (hosted is closest to the current server-action architecture), configure universal/app links and authentication callbacks, define camera/photo and notification permissions, verify native file download/share behavior, and review Apple/Google payment policies. Developer accounts, signing, store assets, privacy disclosures, device testing, and native push providers remain required.
