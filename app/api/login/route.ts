import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { verifyPassword } from "@/lib/auth/password";
import { usernameToInternalEmail } from "@/lib/auth/constants";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function safeDatabaseInfo() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { defined: false as const };
  try {
    const u = new URL(raw);
    return {
      defined: true as const,
      host: u.host,
      db: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return { defined: true as const, host: "(invalid url)", db: "" };
  }
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const rawLogin = parsed.data.username.trim().toLowerCase();
  const email = rawLogin.includes("@") ? rawLogin : usernameToInternalEmail(rawLogin);

  const dbInfo = safeDatabaseInfo();
  console.info("[api/login] attempt", {
    email,
    db: dbInfo,
  });

  const db = getDb();
  const [u] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      active: users.active,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!u?.id || !u.active || !u.passwordHash) {
    console.warn("[api/login] denied", {
      email,
      reason: !u?.id ? "user_not_found" : !u.active ? "user_inactive" : "missing_password_hash",
    });
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
  }

  const ok = verifyPassword(parsed.data.password, u.passwordHash);
  if (!ok) {
    console.warn("[api/login] denied", { email, reason: "wrong_password" });
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, u.id);
  return res;
}
