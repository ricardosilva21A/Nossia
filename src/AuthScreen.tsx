import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { authFlowFromPath, authPaths, initialInviteCode } from "./authFlow";
import type { AuthFlow, CoupleInvitePreview } from "./authFlow";
import { authErrorMessage } from "./authErrors";
import { localDateString } from "./dateUtils";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const kickers: Record<AuthFlow, string> = { join: "TENS UM CONVITE", "sign-up": "CRIAR CONTA", "reset-request": "RECUPERAR ACESSO", "password-update": "NOVA PALAVRA-PASSE", "sign-in": "INICIAR SESSÃO" };
const intros: Record<AuthFlow, string> = {
  join: "Cria a tua própria conta. Os dates, ideias e memórias do casal ficam partilhados entre os dois.",
  "sign-up": "Só o essencial. O resto pode ser preenchido depois, na app.",
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
  const [partnerOneName, setPartnerOneName] = useState("");
  const [partnerTwoName, setPartnerTwoName] = useState("");
  const [relationshipDate, setRelationshipDate] = useState("");
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
          options: { data: { invite_code: initialInviteCode, partner_name: invite.partner_two_name } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("A tua conta está pronta. Confirma o email na caixa de entrada e inicia sessão.");
      } else if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { partner_one_name: partnerOneName.trim(), partner_two_name: partnerTwoName.trim(), relationship_date: relationshipDate } },
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
          <form onSubmit={submit}>
            {mode === "sign-up" && <>
              <div className="form-grid">
                <label className="form-label">O teu nome<input className="form-input" autoComplete="given-name" required maxLength={80} value={partnerOneName} onChange={(event) => setPartnerOneName(event.target.value)} /></label>
                <label className="form-label">Nome da tua cara-metade<input className="form-input" autoComplete="off" required maxLength={80} value={partnerTwoName} onChange={(event) => setPartnerTwoName(event.target.value)} /></label>
              </div>
              <label className="form-label">Início da relação<input className="form-input" type="date" required max={localDateString()} value={relationshipDate} onChange={(event) => setRelationshipDate(event.target.value)} /></label>
            </>}
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
