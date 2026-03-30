/**
 * Domínio interno para login por usuário (sem e-mail real).
 * O Supabase Auth exige um identificador em formato de e-mail;
 * usamos usuário@interno.ponto-or para cada login.
 */
export const INTERNAL_EMAIL_DOMAIN = "@interno.ponto-or";

export function usernameToInternalEmail(username: string): string {
  return `${username.trim().toLowerCase()}${INTERNAL_EMAIL_DOMAIN}`;
}

export function internalEmailToUsername(email: string): string {
  if (email.endsWith(INTERNAL_EMAIL_DOMAIN)) {
    return email.slice(0, -INTERNAL_EMAIL_DOMAIN.length);
  }
  return email;
}
