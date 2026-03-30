import type { NextRequest } from "next/server";

const COOKIE_NAME = "ponto_or_session";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado");
  }
  return secret;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function sign(value: string): Promise<string> {
  const h = await hmacSha256Hex(getSecret(), value);
  return `${value}.${h}`;
}

export async function verifySignedSessionValue(signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = await hmacSha256Hex(getSecret(), value);
  return constantTimeEqual(sig, expected) ? value : null;
}

type CookieSameSite = "lax" | "strict" | "none";
type CookieSetOptions = {
  httpOnly: boolean;
  sameSite: CookieSameSite;
  secure: boolean;
  path: string;
  maxAge: number;
  expires?: Date;
};

type CookieWritableResponse = {
  cookies: {
    set: (name: string, value: string, opts: CookieSetOptions) => void;
  };
};

function shouldUseSecureCookie(): boolean {
  return process.env.COOKIE_SECURE === "true";
}

export async function setSessionCookie(response: CookieWritableResponse, userId: string) {
  const maxAge = 60 * 60 * 24 * 7;
  const signed = await sign(userId);
  response.cookies.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  });
}

export function clearSessionCookie(response: CookieWritableResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifySignedSessionValue(raw);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
