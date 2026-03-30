/**
 * Gera login no formato profissional: primeiro.sobrenome
 * Ex.: "João da Silva" → "joao.silva"
 * Normaliza: minúsculas, remove acentos, apenas letras e ponto.
 */

const ACCENT_MAP: Record<string, string> = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c",
};

function normalizeSegment(str: string): string {
  let out = str.toLowerCase().trim();
  out = out.replace(/[\u0300-\u036f]/g, "");
  for (const [accent, plain] of Object.entries(ACCENT_MAP)) {
    out = out.replace(new RegExp(accent, "g"), plain);
  }
  return out.replace(/[^a-z0-9]/g, "");
}

/**
 * Gera o username no formato primeiro.sobrenome a partir do nome completo.
 * Se o nome tiver uma única palavra, retorna apenas essa palavra normalizada.
 */
export function usernameFromFullName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeSegment)
    .filter((s) => s.length > 0);

  if (parts.length === 0) return "usuario";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}`;
}

/**
 * Garante username único: se base já existe no conjunto, adiciona sufixo (ex.: matrícula).
 */
export function ensureUniqueUsername(
  baseUsername: string,
  existingUsernames: Set<string>,
  suffix?: string
): string {
  let candidate = baseUsername;
  if (suffix) candidate = `${baseUsername}.${suffix}`;
  if (!existingUsernames.has(candidate)) return candidate;
  let n = 1;
  while (existingUsernames.has(`${candidate}.${n}`)) n++;
  return `${candidate}.${n}`;
}
