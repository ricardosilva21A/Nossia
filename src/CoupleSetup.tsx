import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "./lib/supabase";
import { localDateString } from "./dateUtils";
import { inviteCodeFromPath } from "./authFlow";
import type { CoupleInvitePreview } from "./authFlow";

// Right after signing in for the first time (with email or Google), before there is a couple:
// either start one (your name, theirs, since when) or, with the other one's invite link, join
// theirs (your name and birthday). Each person keeps their own account.

const pendingKey = "nossia-pending-invite";

export function savePendingInvite(code: string) {
  try { window.localStorage.setItem(pendingKey, code); } catch { /* the link can be pasted instead */ }
}

function readPendingInvite() {
  try { return window.localStorage.getItem(pendingKey); } catch { return null; }
}

function clearPendingInvite() {
  try { window.localStorage.removeItem(pendingKey); } catch { /* nothing to clear */ }
}

// An invite pasted as the whole link or just its code.
export function inviteCodeFrom(text: string) {
  const trimmed = text.trim();
  if (/^[a-f0-9]{32}$/.test(trimmed)) return trimmed;
  try { return inviteCodeFromPath(new URL(trimmed).pathname); } catch { return null; }
}

const messages: Array<[RegExp, string]> = [
  [/invalid or has expired/i, "Este convite já foi usado ou expirou. Pede um novo no perfil do casal."],
  [/already has a couple/i, "Esta conta já tem um casal."],
  [/relationship date/i, "Indica desde quando estão juntos."],
  [/names are required/i, "Escreve os dois nomes."],
];
const friendly = (message: string) => messages.find(([pattern]) => pattern.test(message))?.[1] ?? `Não foi possível guardar: ${message}`;

type Props = { suggestedName: string; onDone: () => void; onSignOut: () => void };

export function CoupleSetup({ suggestedName, onDone, onSignOut }: Props) {
  const [code, setCode] = useState<string | null>(() => inviteCodeFromPath(window.location.pathname) ?? readPendingInvite());
  const [invite, setInvite] = useState<CoupleInvitePreview | null>(null);
  const [checking, setChecking] = useState(Boolean(code));
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [myName, setMyName] = useState(suggestedName);
  const [partnerName, setPartnerName] = useState("");
  const [since, setSince] = useState("");
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code || !supabase) { setInvite(null); setChecking(false); return; }
    let active = true;
    setChecking(true);
    void supabase.rpc("get_couple_invite", { invite_code: code }).then(({ data, error: inviteError }) => {
      if (!active) return;
      const preview = (data as CoupleInvitePreview[] | null)?.[0] ?? null;
      setInvite(preview);
      setChecking(false);
      if (inviteError || !preview) {
        clearPendingInvite();
        setError("Este convite já foi usado ou expirou. Podes criar o vosso casal aqui ou pedir um novo convite.");
      }
    });
    return () => { active = false; };
  }, [code]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: saveError } = invite && code
      ? await supabase.rpc("join_couple_by_invite", { invite_code: code, my_name: myName.trim(), my_birth_date: birthday || null })
      : await supabase.rpc("setup_my_couple", { my_name: myName.trim(), partner_name: partnerName.trim(), together_since: since, my_birth_date: birthday || null });
    setBusy(false);
    if (saveError) { setError(friendly(saveError.message)); return; }
    clearPendingInvite();
    if (inviteCodeFromPath(window.location.pathname)) window.history.replaceState(window.history.state, "", "/hoje");
    onDone();
  }

  const joining = Boolean(invite && code);
  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <a className="brand" href="#"><span className="brand-mark">n</span><span className="brand-name">nossia</span></a>
        <div className="auth-quote"><h1>Só falta<br />conhecer-vos.</h1><p>Uns dados rápidos e a vossa casa fica pronta.</p></div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <p className="section-kicker">{joining ? "ENTRAR NO CASAL" : "O VOSSO CASAL"}</p>
          <h2>{checking ? "Um momento…" : joining && invite ? `${invite.partner_one_name} está à tua espera` : "Conta-nos de vocês"}</h2>
          <p className="auth-intro">{joining ? "Esta é a tua conta. Os dates, as ideias e as memórias ficam partilhados entre os dois." : "Depois convidas a tua cara-metade a criar a conta dela, com um link."}</p>
          {!checking && <form onSubmit={(event) => void submit(event)}>
            <label className="form-label">O teu nome<input className="form-input" autoComplete="given-name" required maxLength={80} value={myName} onChange={(event) => setMyName(event.target.value)} /></label>
            {!joining && <>
              <label className="form-label">Nome da tua cara-metade<input className="form-input" autoComplete="off" required maxLength={80} value={partnerName} onChange={(event) => setPartnerName(event.target.value)} /></label>
              <label className="form-label">Estão juntos desde<input className="form-input" type="date" required max={localDateString()} value={since} onChange={(event) => setSince(event.target.value)} /></label>
            </>}
            <label className="form-label">O teu aniversário <span>(opcional)</span><input className="form-input" type="date" max={localDateString()} value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
            {error && <p className="form-alert error-alert" role="alert">{error}</p>}
            <button className="modal-submit auth-submit" type="submit" disabled={busy}>{busy ? "Um momento…" : joining ? "Entrar no casal" : "Criar o nosso casal"} <span>→</span></button>
          </form>}
          {!checking && !joining && (pasting
            ? <form className="setup-invite" onSubmit={(event) => { event.preventDefault(); const found = inviteCodeFrom(pasted); if (found) { setError(""); savePendingInvite(found); setCode(found); setPasting(false); } else setError("Esse link não parece um convite da Nossia."); }}>
              <label className="form-label">Link do convite<input className="form-input" inputMode="url" value={pasted} placeholder="https://nossia.vercel.app/join/…" onChange={(event) => setPasted(event.target.value)} /></label>
              <button type="submit" className="button button-secondary">Usar este convite</button>
            </form>
            : <p className="auth-switch">Recebeste um convite? <button type="button" onClick={() => setPasting(true)}>Colar o link</button></p>)}
          <p className="auth-switch"><button type="button" onClick={onSignOut}>Terminar sessão</button></p>
        </div>
      </main>
    </div>
  );
}
