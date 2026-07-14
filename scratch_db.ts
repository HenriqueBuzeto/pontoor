import { config } from "dotenv";
import { resolve } from "path";
// Load env vars from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { getDb } from "./lib/db";
import { timeEntries, timeCalculations, employees } from "./lib/db/schema";
import { and, eq, lte, gte, like, or } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Conectando ao banco de dados...");

  // 1. Achar o ID do colaborador
  const matchingEmployees = await db
    .select({ id: employees.id, name: employees.name, email: employees.email })
    .from(employees)
    .where(
      or(
        like(employees.email, "gisleni.alfinete.005%"),
        eq(employees.registration, "gisleni.alfinete.005")
      )
    );

  if (matchingEmployees.length === 0) {
    console.error("Colaborador gisleni.alfinete.005 não encontrado!");
    process.exit(1);
  }

  const employee = matchingEmployees[0];
  console.log(`Colaborador encontrado: ${employee.name} (ID: ${employee.id}, Email: ${employee.email})`);

  // Definindo a data 11/07/2026 no fuso America/Sao_Paulo
  // Horários de início e fim em UTC correspondentes ao dia 11/07/2026 no fuso -03:00
  // 11/07/2026 00:00 -03:00 = 11/07/2026 03:00:00 UTC
  // 11/07/2026 23:59:59.999 -03:00 = 12/07/2026 02:59:59.999 UTC
  const startOfDay = new Date("2026-07-11T03:00:00Z");
  const endOfDay = new Date("2026-07-12T02:59:59.999Z");

  // 2. Deletar time entries do dia 11/07/2026
  console.log("Removendo todas as marcações de ponto do dia 11/07/2026...");
  const deletedEntries = await db
    .delete(timeEntries)
    .where(
      and(
        eq(timeEntries.employeeId, employee.id),
        gte(timeEntries.occurredAt, startOfDay),
        lte(timeEntries.occurredAt, endOfDay)
      )
    )
    .returning({ id: timeEntries.id, occurredAt: timeEntries.occurredAt, type: timeEntries.type });

  console.log(`Deletadas ${deletedEntries.length} marcações:`, deletedEntries);

  // 3. Deletar time calculation do dia 11/07/2026
  console.log("Removendo cálculo cached do dia 11/07/2026...");
  const deletedCalculations = await db
    .delete(timeCalculations)
    .where(
      and(
        eq(timeCalculations.employeeId, employee.id),
        eq(timeCalculations.date, "2026-07-11")
      )
    )
    .returning({ id: timeCalculations.id });

  console.log(`Deletados ${deletedCalculations.length} cálculos.`);
  console.log("Pronto!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao executar script:", err);
  process.exit(1);
});
