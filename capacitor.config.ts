import type { CapacitorConfig } from "@capacitor/cli";

const hostedUrl =
  process.env.CAPACITOR_SERVER_URL ?? "https://app.junkquote.pro";
const hostedHost = new URL(hostedUrl).hostname;

if (!hostedUrl.startsWith("https://")) {
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS.");
}

const config: CapacitorConfig = {
  appId: "com.junkquote.pro",
  appName: "JunkQuote Pro",
  webDir: "native-shell",
  loggingBehavior: "debug",
  appendUserAgent: " JunkQuoteProNative/1.0",
  backgroundColor: "#0f172aff",
  server: {
    url: hostedUrl,
    cleartext: false,
    allowNavigation: [hostedHost],
    errorPath: "index.html",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    resolveServiceWorkerRequests: true,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#0f172aff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
