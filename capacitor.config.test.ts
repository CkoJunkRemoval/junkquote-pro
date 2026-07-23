import { describe, expect, it } from "vitest";
import config from "./capacitor.config";

describe("Capacitor configuration", () => {
  it("uses the stable native identity and hosted HTTPS strategy", () => {
    expect(config.appId).toBe("com.junkquote.pro");
    expect(config.appName).toBe("JunkQuote Pro");
    expect(config.webDir).toBe("native-shell");
    expect(config.server?.url).toMatch(/^https:\/\//);
    expect(config.server?.cleartext).toBe(false);
  });

  it("does not automatically prompt for or register push notifications", () => {
    expect(config.plugins?.PushNotifications).toEqual({
      presentationOptions: ["badge", "sound", "alert"],
    });
  });
});
