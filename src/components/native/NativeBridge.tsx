"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { nativeRouteFromUrl, isExternalWebUrl } from "@/lib/native/platform";

export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const removers: Array<() => Promise<void>> = [];
    const navigate = (url: string) => {
      const route = nativeRouteFromUrl(url);
      if (route) window.location.assign(route);
    };
    void Promise.all([
      import("@capacitor/app"),
      import("@capacitor/browser"),
      import("@capacitor/splash-screen"),
      import("@capacitor/push-notifications"),
    ]).then(
      async ([
        { App },
        { Browser },
        { SplashScreen },
        { PushNotifications },
      ]) => {
        if (cancelled) return;
        const link = await App.addListener("appUrlOpen", ({ url }) =>
          navigate(url),
        );
        const back = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) history.back();
          else void App.minimizeApp();
        });
        removers.push(
          () => link.remove(),
          () => back.remove(),
        );
        const launch = await App.getLaunchUrl();
        if (launch?.url) navigate(launch.url);
        const click = (event: MouseEvent) => {
          const anchor = (event.target as Element | null)?.closest(
            "a[href]",
          ) as HTMLAnchorElement | null;
          if (!anchor || !isExternalWebUrl(anchor.href, window.location.origin))
            return;
          event.preventDefault();
          void Browser.open({ url: anchor.href, presentationStyle: "popover" });
        };
        document.addEventListener("click", click);
        removers.push(async () => document.removeEventListener("click", click));
        const pushPermission = await PushNotifications.checkPermissions();
        document.documentElement.dataset.nativePushPermission =
          pushPermission.receive;
        await SplashScreen.hide();
      },
    );
    return () => {
      cancelled = true;
      void Promise.all(removers.map((remove) => remove()));
    };
  }, []);
  return null;
}
