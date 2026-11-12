import { supabase } from "./lib/supabase";

// Anonymous usage counts: only the name of what was used ("view:prendas", "proposal:accepted"),
// with a random id for this device that isn't linked to the account. No titles, messages, places
// or names. Anyone can turn it off in the settings.

const deviceKey = "nossia-device";
const optOutKey = "nossia-usage";

function deviceId() {
  try {
    let id = window.localStorage.getItem(deviceKey);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(deviceKey, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function usageAllowed() {
  try {
    return window.localStorage.getItem(optOutKey) !== "off";
  } catch {
    return false;
  }
}

export function setUsageAllowed(on: boolean) {
  try {
    window.localStorage.setItem(optOutKey, on ? "on" : "off");
  } catch {
    // Blocked storage: nothing is recorded either, since there's no device id.
  }
}

export function track(name: string) {
  if (!supabase || !usageAllowed() || !/^[a-z0-9_:]{1,60}$/.test(name)) return;
  const device = deviceId();
  if (!device) return;
  void supabase.from("app_events").insert({ name, device }).then(() => undefined, () => undefined);
}
