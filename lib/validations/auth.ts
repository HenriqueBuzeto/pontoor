import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuário obrigatório").max(100, "Usuário muito longo"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const recoverPasswordSchema = z.object({
  username: z.string().min(1, "Usuário obrigatório"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
