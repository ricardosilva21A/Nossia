// Supabase answers in English, and the app shouldn't.
export function authErrorMessage(message: string) {
  const text = message.toLowerCase();
  const length = text.match(/at least (\d+) characters/)?.[1];
  if (text.includes("invalid login credentials")) return "O email ou a palavra-passe não estão corretos.";
  if (text.includes("email not confirmed")) return "Confirma primeiro o teu email, através da ligação que te enviámos.";
  if (text.includes("already registered") || text.includes("already been registered")) return "Já existe uma conta com este email.";
  if (text.includes("should be different")) return "A nova palavra-passe tem de ser diferente da anterior.";
  if (length) return `A palavra-passe tem de ter pelo menos ${length} caracteres.`;
  if (text.includes("password")) return "Escolhe uma palavra-passe mais segura.";
  if (text.includes("rate limit") || text.includes("security purposes") || text.includes("too many")) return "Foram feitos demasiados pedidos. Espera um pouco e tenta outra vez.";
  if (text.includes("session") || text.includes("expired") || text.includes("otp")) return "Esta ligação expirou. Pede uma nova.";
  if (text.includes("email") && (text.includes("invalid") || text.includes("validate"))) return "Esse email não parece estar correto.";
  if (text.includes("failed to fetch") || text.includes("network")) return "Sem ligação à internet. Tenta outra vez.";
  return "Não foi possível concluir o pedido. Tenta outra vez.";
}
