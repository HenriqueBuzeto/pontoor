import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

export async function GET() {
  try {
    const db = getDb();
    const newHash = hashPassword("232323");

    const updated = await db
      .update(users)
      .set({
        email: "mariane.martins@interno.ponto-or",
        passwordHash: newHash,
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, "efcb156a-8635-41fd-baf1-fbdfc23cd5ae"))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
      });

    return NextResponse.json({
      success: true,
      message: "Usuário mariane.martins atualizado com sucesso!",
      login: "mariane.martins",
      senha: "232323",
      hashGerado: newHash,
      usuario: updated[0] ?? null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
