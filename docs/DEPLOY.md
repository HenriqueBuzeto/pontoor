# Ponto OR — Deploy e operação

## Variáveis de ambiente (produção)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon do Supabase |
| `DATABASE_URL` | Sim | Connection string PostgreSQL (ex.: do Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional | Apenas se precisar bypass RLS em server actions |

## Build

```bash
npm ci
npm run build
```

## Executar em produção

```bash
npm run start
```

Ou use um processo manager (PM2, systemd) apontando para `npm run start` ou `node .next/standalone/server.js` se configurar `output: 'standalone'` no Next.js.

## Banco de dados

1. Aplique as migrations: execute `lib/db/migrations/0000_init.sql` no Supabase (SQL Editor) ou use `npm run db:push`.
2. Execute as políticas RLS: `lib/db/rls-policies.sql` no SQL Editor do Supabase.
3. (Opcional) Seed: `npm run db:seed` — ajuste os IDs no seed ou use variáveis de ambiente para demo.

## Supabase Auth

- Habilite Email/Password em Authentication > Providers.
- Em URL Configuration, defina Site URL e Redirect URLs (ex.: `https://seu-dominio.com`, `https://seu-dominio.com/auth/callback`).
- Para recuperação de senha, o e-mail de redirect deve apontar para `/auth/callback` ou para uma página de redefinição.

## Observabilidade (estrutura sugerida)

- **Logs**: Use um provider (Datadog, Axiom, Better Stack) e envie logs de erro e de auditoria (já temos tabela `audit_logs`).
- **Monitoramento**: Health check em `/api/health` (criar route que verifica DB e Supabase).
- **Rate limiting**: Em produção, use Vercel Edge Config, Upstash ou middleware com Redis para rotas sensíveis (login, registro de ponto).

## Checklist de produção

- [ ] Variáveis de ambiente configuradas e seguras
- [ ] Migrations e RLS aplicados no banco
- [ ] Supabase Auth configurado (URLs de redirect)
- [ ] HTTPS em produção
- [ ] Headers de segurança (Next.js ou CDN)
- [ ] Backup do banco configurado (Supabase faz por padrão)
- [ ] Atestado técnico / responsável técnico conforme exigência do REP
- [ ] LGPD: política de privacidade e tratamento de dados pessoais (CPF, etc.) documentado
