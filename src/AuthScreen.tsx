import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { authFlowFromPath, authPaths, initialInviteCode } from "./authFlow";
import type { AuthFlow, CoupleInvitePreview } from "./authFlow";
import { authErrorMessage } from "./authErrors";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { savePendingInvite } from "./CoupleSetup";

const kickers: Record<AuthFlow, string> = { join: "TENS UM CONVITE", "sign-up": "CRIAR CONTA", "reset-request": "RECUPERAR ACESSO", "password-update": "NOVA PALAVRA-PASSE", "sign-in": "INICIAR SESSÃO" };
const intros: Record<AuthFlow, string> = {
  join: "Cria a tua própria conta. Os dates, ideias e memórias do casal ficam partilhados entre os dois.",
  "sign-up": "Cada um tem a sua conta. Depois de entrares, pedimos os dados do casal e convidas a tua cara-metade.",
  "reset-request": "Indiquem o email da conta e enviamos uma ligação para redefinir a palavra-passe.",
  "password-update": "Escolham uma palavra-passe com pelo menos 8 caracteres.",
  "sign-in": "Iniciem sessão e continuem de onde ficaram.",
};
const submitLabels: Record<AuthFlow, string> = { join: "Criar a minha conta", "sign-up": "Criar conta", "reset-request": "Enviar ligação de recuperação", "password-update": "Atualizar palavra-passe", "sign-in": "Iniciar sessão" };

export function AuthScreen({ initialMode, onModeChange, recovery = false, onRecoveryComplete }: { initialMode: AuthFlow; onModeChange: (mode: AuthFlow) => void; recovery?: boolean; onRecoveryComplete?: () => void }) {
  const [mode, setMode] = useState<AuthFlow>(recovery ? "password-update" : initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState<CoupleInvitePreview | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);

  useEffect(() => {
    setMode(recovery ? "password-update" : initialMode);
  }, [initialMode, recovery]);

  useEffect(() => {
    if (mode !== "join" || !initialInviteCode || !supabase) {
      setInviteChecked(true);
      return;
    }
    let active = true;
    setInviteChecked(false);
    void supabase.rpc("get_couple_invite", { invite_code: initialInviteCode }).then(({ data, error: inviteError }) => {
      if (!active) return;
      const preview = (data as CoupleInvitePreview[] | null)?.[0] ?? null;
      setInvite(preview);
      if (inviteError || !preview) setError("Esta ligação de convite já foi usada ou expirou. Peçam uma nova no perfil do casal.");
      setInviteChecked(true);
    });
    return () => { active = false; };
  }, [mode]);

  // The invite travels with the person, whichever way they sign in (email or Google).
  useEffect(() => {
    if (mode === "join" && initialInviteCode) savePendingInvite(initialInviteCode);
  }, [mode]);

  async function continueWithGoogle() {
    if (!supabase) return;
    setError("");
    if (mode === "join" && initialInviteCode) savePendingInvite(initialInviteCode);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/hoje` } });
    if (oauthError) setError(authErrorMessage(oauthError.message));
  }

  useEffect(() => {
    const handlePopState = () => setMode(authFlowFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function changeMode(nextMode: AuthFlow) {
    setMode(nextMode);
    onModeChange(nextMode);
    setError("");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("O Supabase ainda não está configurado. Adicione o URL do projeto e a chave anónima às definições de implementação.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "password-update") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("Palavra-passe atualizada. Já podem continuar a usar a Nossia.");
        onRecoveryComplete?.();
      } else if (mode === "reset-request") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}${authPaths["reset-request"]}` });
        if (recoveryError) throw recoveryError;
        setMessage("Se existir uma conta com esse email, receberão uma ligação para definir uma nova palavra-passe.");
      } else if (mode === "join") {
        if (!invite || !initialInviteCode) throw new Error("Esta ligação de convite já não é válida.");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("A tua conta está pronta. Confirma o email na caixa de entrada e inicia sessão.");
      } else if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("A conta está pronta. Confirma o email na caixa de entrada e inicia sessão.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : ""));
    } finally {
      setLoading(false);
    }
  }

  const headings: Record<AuthFlow, string> = {
    join: invite ? `${invite.partner_one_name} convidou-te para a Nossia` : "Convite para a Nossia",
    "sign-up": "Comecem a vossa história juntos",
    "reset-request": "Esqueceram-se da palavra-passe?",
    "password-update": "Criem uma nova palavra-passe",
    "sign-in": "É bom ter-vos de volta",
  };
  const creating = mode === "sign-up" || mode === "join";
  const toSignIn = creating || mode === "reset-request";

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <a className="brand" href="#"><span className="brand-mark">n</span><span className="brand-name">nossia</span></a>
        <div className="auth-quote"><h1>Criem tempo<br />para vocês.</h1><p>Planeiem os dates. Guardem as memórias. Celebrem as pequenas coisas que fazem de vocês, vocês.</p></div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <p className="section-kicker">{kickers[mode]}</p>
          <h2>{headings[mode]}</h2>
          <p className="auth-intro">{intros[mode]}</p>
          {(mode === "sign-in" || mode === "sign-up" || mode === "join") && <>
            <button type="button" className="google-button" disabled={!isSupabaseConfigured || (mode === "join" && (!inviteChecked || !invite))} onClick={() => void continueWithGoogle()}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continuar com Google
            </button>
            <p className="auth-or"><span>ou com email</span></p>
          </>}
          <form onSubmit={submit}>
            {mode !== "password-update" && <label className="form-label">Email<input className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
            {mode !== "reset-request" && <label className="form-label">Palavra-passe<input className="form-input" type="password" autoComplete={mode === "sign-up" || mode === "join" || mode === "password-update" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" /></label>}
            {mode === "sign-in" && <button className="auth-forgot-button" type="button" onClick={() => changeMode("reset-request")}>Esqueci-me da palavra-passe</button>}
            {error && <p className="form-alert error-alert" role="alert">{error}</p>}
            {message && <p className="form-alert success-alert" role="status">{message}</p>}
            {!isSupabaseConfigured && <p className="form-alert config-alert">Ligue um projeto Supabase para ativar contas privadas e sincronizar dates. Consulte os passos de configuração no README.</p>}
            <button className="modal-submit auth-submit" type="submit" disabled={loading || !isSupabaseConfigured || (mode === "join" && (!inviteChecked || !invite))}>{loading ? "Um momento…" : submitLabels[mode]} <span>→</span></button>
          </form>
          {mode !== "password-update" && <p className="auth-switch">{toSignIn ? "Já têm uma conta?" : "Ainda não têm conta?"} <button onClick={() => changeMode(toSignIn ? "sign-in" : "sign-up")}>{toSignIn ? "Iniciar sessão" : "Criar conta"}</button></p>}
          {creating && <p className="auth-legal">Ao criar conta, aceitas a <a href="/privacidade" target="_blank" rel="noopener noreferrer">política de privacidade</a>.</p>}
          {mode === "password-update" && <p className="auth-switch"><button onClick={() => changeMode("sign-in")}>Voltar ao início de sessão</button></p>}
        </div>
      </main>
    </div>
  );
}
