"use client";

import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isStandalone,
  notificationPermissionState,
  shouldRegisterServiceWorker,
} from "@/lib/pwa/policy";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const DISMISS_KEY = "junkquote-pwa-install-dismissed";
const COOLDOWN = 14 * 24 * 60 * 60 * 1000;

export async function clearPwaSessionState() {
  localStorage.removeItem(DISMISS_KEY);
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
}

export function PwaManager() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [reachable, setReachable] = useState(true);
  const [checking, setChecking] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [pushPermission, setPushPermission] = useState("unsupported");
  const standalone =
    typeof window !== "undefined" &&
    isStandalone(
      window.matchMedia("(display-mode: standalone)").matches,
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );

  const probe = useCallback(async () => {
    if (!navigator.onLine) {
      setReachable(false);
      return;
    }
    setChecking(true);
    try {
      const response = await fetch("/api/health/live", { cache: "no-store" });
      setReachable(response.ok);
    } catch {
      setReachable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      setCurrentTime(Date.now());
      setDismissedAt(Number(localStorage.getItem(DISMISS_KEY) ?? 0));
      setPushPermission(
        notificationPermissionState(
          "Notification" in window,
          "Notification" in window ? Notification.permission : undefined,
        ),
      );
    }, 0);
    void probe();
    const timer = window.setInterval(() => void probe(), 60_000);
    window.addEventListener("online", probe);
    window.addEventListener("offline", probe);
    return () => {
      clearInterval(timer);
      clearTimeout(initial);
      window.removeEventListener("online", probe);
      window.removeEventListener("offline", probe);
    };
  }, [probe]);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (
      !shouldRegisterServiceWorker(
        process.env.NODE_ENV,
        process.env.NEXT_PUBLIC_ENABLE_LOCAL_PWA,
        "serviceWorker" in navigator,
      )
    )
      return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    let refreshing = false;
    const onController = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (registration.waiting) setUpdateWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdateWorker(worker);
          });
        });
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onController,
      );
    };
  }, []);

  const canOffer =
    !standalone &&
    !pathname.startsWith("/portal") &&
    !pathname.startsWith("/approve") &&
    currentTime - dismissedAt > COOLDOWN;
  const install = async () => {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "dismissed") {
      const now = Date.now();
      localStorage.setItem(DISMISS_KEY, String(now));
      setDismissedAt(now);
    }
    setInstallPrompt(null);
  };
  return (
    <div className="contents" data-push-permission={pushPermission}>
      {!reachable && (
        <div
          role="status"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 flex items-center gap-2 rounded-full bg-amber-950 px-4 py-2 text-sm text-white shadow-lg"
        >
          <WifiOff size={16} />
          {checking
            ? "Checking connection…"
            : "Offline — field uploads remain queued"}
          <button onClick={() => void probe()} aria-label="Retry connection">
            <RefreshCw size={15} />
          </button>
        </div>
      )}
      {updateWorker && (
        <div
          role="status"
          className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-xl bg-slate-950 p-3 text-sm text-white shadow-xl"
        >
          Update available{" "}
          <button
            className="ml-2 rounded bg-emerald-500 px-3 py-1 font-semibold text-slate-950"
            onClick={() => updateWorker.postMessage({ type: "SKIP_WAITING" })}
          >
            Reload
          </button>
        </div>
      )}
      {canOffer && (
        <button
          onClick={() => void install()}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg"
        >
          <Download size={16} />
          Install JunkQuote Pro
        </button>
      )}
      {showInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install JunkQuote Pro"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
        >
          <div className="max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <button
              className="float-right"
              aria-label="Close"
              onClick={() => {
                const now = Date.now();
                setShowInstructions(false);
                localStorage.setItem(DISMISS_KEY, String(now));
                setDismissedAt(now);
              }}
            >
              <X />
            </button>
            <h2 className="text-xl font-bold">Install JunkQuote Pro</h2>
            <p className="mt-3 text-sm">
              On iPhone or iPad, open this site in Safari, tap Share, then Add
              to Home Screen. On Android Chrome or desktop Chrome/Edge, open the
              browser menu and choose Install app.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
