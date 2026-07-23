export const NATIVE_APP_SCHEME = "junkquote";
export const NATIVE_APP_HOST = "app.junkquote.pro";

export function nativeRouteFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === `${NATIVE_APP_SCHEME}:`) {
      const route = [url.host, url.pathname].filter(Boolean).join("/");
      return `/${route.replace(/^\/+/, "")}${url.search}${url.hash}`;
    }
    if (url.protocol === "https:" && url.hostname === NATIVE_APP_HOST) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isExternalWebUrl(value: string, currentOrigin: string) {
  try {
    const url = new URL(value, currentOrigin);
    return (
      ["http:", "https:"].includes(url.protocol) && url.origin !== currentOrigin
    );
  } catch {
    return false;
  }
}
