// Whether this phone can get notifications, and why not. Shared by the settings and the
// reminder on Hoje, so both say the same thing.

export type PushStatus = "not-configured" | "unsupported" | "needs-install" | "denied" | "off" | "on";

export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function devicePushStatus(): Promise<PushStatus> {
  try {
    if (!vapidPublicKey) return "not-configured";
    if (isIos() && !isInstalled()) return "needs-install";
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? "on" : "off";
  } catch {
    return "unsupported";
  }
}
