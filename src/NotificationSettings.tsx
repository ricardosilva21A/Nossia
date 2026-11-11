import { useEffect, useState } from "react";
import { Bell, BellOff, Share, SquarePlus } from "lucide-react";
import { supabase } from "./lib/supabase";

type Status = "checking" | "not-configured" | "unsupported" | "needs-install" | "denied" | "off" | "on";
type Preferences = { dates: boolean; commitments: boolean; nudges: boolean; special_dates: boolean; affection: boolean };

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const defaults: Preferences = { dates: true, commitments: true, nudges: true, special_dates: true, affection: true };
const options: Array<{ key: keyof Preferences; label: string; hint: string }> = [
  { key: "dates", label: "Dates", hint: "Na véspera, pouco antes, e depois para contarem como foi" },
  { key: "commitments", label: "Compromissos", hint: "Na véspera e pouco antes" },
  { key: "nudges", label: "Marcar o fim de semana", hint: "À quinta, se estiverem livres e sem nada marcado" },
  { key: "special_dates", label: "Datas especiais", hint: "Aniversário de namoro e anos, uma semana antes e na véspera" },
  { key: "affection", label: "Carinhos", hint: "Quando o teu par te manda um beijo, um abraço ou um aceno" },
];

function keyBytes(base64: string) {
  const text = atob(base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Notifications belong to a device, so each partner turns them on on their own phone.
export function NotificationSettings({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      let next: Status;
      if (!publicKey) next = "not-configured";
      else if (isIos() && !isInstalled()) next = "needs-install";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        next = subscription ? "on" : "off";
      }
      if (!active) return;
      setStatus(next);
      const { data } = await supabase?.from("notification_settings").select("dates, commitments, nudges, special_dates, affection").eq("user_id", userId).maybeSingle() ?? { data: null };
      if (active && data) setPreferences(data as Preferences);
    })().catch(() => { if (active) setStatus("unsupported"); });
    return () => { active = false; };
  }, [userId]);

  async function turnOn() {
    if (!supabase || !publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const keys = subscription.toJSON().keys;
      const { error } = await supabase.rpc("save_push_subscription", { device_endpoint: subscription.endpoint, device_p256dh: keys?.p256dh ?? "", device_auth: keys?.auth ?? "" });
      if (error) throw error;
      setStatus("on");
    } catch (caught) {
      setMessage(`Não foi possível ligar as notificações: ${caught instanceof Error ? caught.message : "erro desconhecido"}`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        if (error) throw error;
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (caught) {
      setMessage(`Não foi possível desligar as notificações: ${caught instanceof Error ? caught.message : "erro desconhecido"}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/notifications", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
      const result = await response.json().catch(() => ({})) as { delivered?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setMessage(result.delivered ? "Enviada. Deve chegar dentro de segundos." : "Não foi entregue a nenhum dispositivo. Desliguem e voltem a ligar as notificações.");
    } catch (caught) {
      setMessage(`Não foi possível enviar: ${caught instanceof Error ? caught.message : "erro desconhecido"}`);
    } finally {
      setBusy(false);
    }
  }

  async function togglePreference(key: keyof Preferences) {
    if (!supabase) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    const { error } = await supabase.from("notification_settings").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
    if (error) {
      setPreferences(preferences);
      setMessage(`Não foi possível guardar a preferência: ${error.message}`);
    }
  }

  return (
    <article className="schedule-card notifications-card">
      <h2>Notificações</h2>
      {status === "checking" && <p className="schedule-hint">A verificar este dispositivo…</p>}
      {status === "not-configured" && <p className="schedule-hint">As notificações ainda não estão configuradas neste site.</p>}
      {status === "unsupported" && <p className="schedule-hint">Este browser não suporta notificações. Experimentem no telemóvel, ou noutro browser.</p>}
      {status === "denied" && <p className="schedule-hint">As notificações estão bloqueadas para a Nossia. Ativem-nas nas definições do dispositivo e voltem aqui.</p>}
      {status === "needs-install" && <>
        <p className="schedule-hint">No iPhone, as notificações só funcionam com a Nossia no ecrã principal:</p>
        <ol className="calendar-sync-steps install-steps">
          <li>Abram este site no Safari e toquem em <Share size={15} aria-label="Partilhar" />.</li>
          <li>Escolham <strong>Adicionar ao ecrã principal</strong> <SquarePlus size={15} aria-hidden="true" />.</li>
          <li>Abram a Nossia a partir desse ícone, entrem na conta e voltem aqui à Agenda.</li>
        </ol>
      </>}
      {status === "off" && <>
        <p className="schedule-hint">Lembretes de dates e compromissos neste dispositivo. Cada um liga no seu telemóvel.</p>
        <button type="button" className="button button-primary" disabled={busy} onClick={() => void turnOn()}><Bell size={16} aria-hidden="true" />Ligar notificações</button>
      </>}
      {status === "on" && <>
        <ul className="notification-options">
          {options.map((option) => <li key={option.key}><label><input type="checkbox" checked={preferences[option.key]} onChange={() => void togglePreference(option.key)} /><span><strong>{option.label}</strong><small>{option.hint}</small></span></label></li>)}
        </ul>
        <div className="panel-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => void sendTest()}>Enviar uma de teste</button>
          <button type="button" className="button button-ghost" disabled={busy} onClick={() => void turnOff()}><BellOff size={16} aria-hidden="true" />Desligar neste dispositivo</button>
        </div>
      </>}
      {message && <p className="form-alert config-alert" role="status">{message}</p>}
    </article>
  );
}
