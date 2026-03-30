# Ponto OR — Arquitetura e Planejamento

## 1. Visão geral da solução

O **Ponto OR** é um SaaS B2B de gestão de ponto eletrônico e controle de jornada para empresas, multi-tenant, com foco em conformidade à CLT (art. 74), REP e boas práticas de auditoria e compliance no Brasil.

### Princípios arquiteturais

- **Multi-tenant real**: isolamento por `tenant_id` em todas as entidades; RLS no Supabase; sem vazamento de dados entre empresas.
- **Domínio rico**: jornadas, escalas, apuração, banco de horas e relatórios modelados com regras de negócio explícitas.
- **Segurança em camadas**: Auth (Supabase), autorização por perfil e permissões, validação (Zod) no cliente e no servidor, logs de auditoria.
- **Performance**: paginação real, índices analíticos, queries otimizadas, server components onde possível.
- **Escalabilidade**: serviços stateless, filas futuras para processamento em lote (fechamento, relatórios pesados).

---

## 2. Mapa de módulos

| Módulo | Descrição | Principais entidades |
|--------|-----------|----------------------|
| **Auth & Acesso** | Login, recuperação de senha, sessão, convites, onboarding | users, sessions, invitations, tenants |
| **Cadastro organizacional** | Empresas, filiais, departamentos, equipes, cargos, centros de custo, calendário | tenants, branches, departments, teams, roles, cost_centers, calendar_events |
| **Colaboradores** | Dados pessoais/corporativos, vínculos, histórico | employees, employee_history |
| **Jornadas e escalas** | Jornadas (fixa, flexível, escalas 5x2, 12x36 etc.), regras, tolerâncias | work_schedules, scales, schedule_rules |
| **Registro de ponto** | Marcações entrada/saída/intervalo, origem, geolocalização opcional | time_entries, time_entry_sources |
| **Ajustes e justificativas** | Solicitações, anexos, fluxo de aprovação | adjustments, justifications, approvals |
| **Apuração** | Cálculo de horas, extras, atrasos, faltas, banco de horas | payroll_periods, time_calculations, hour_bank_transactions |
| **Fechamento** | Fechamento por período, travamento, espelho consolidado | period_closures, closure_versions |
| **Espelho de ponto** | Visão por colaborador/período, exportação PDF | (views + relatórios) |
| **Relatórios** | Filtros avançados, exportação PDF/CSV/XLSX | report_definitions, report_runs |
| **Auditoria** | Logs de todas as ações sensíveis | audit_logs |
| **Notificações** | Email transacional, in-app | notifications, notification_preferences |

---

## 3. Arquitetura técnica

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js)                               │
│  App Router │ React Hook Form + Zod │ TanStack Table │ Recharts │ Zustand │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (App Router)                           │
│  Server Actions │ Route Handlers │ Middleware (auth, tenant)             │
│  Services (use cases) │ Repositories │ Validação Zod compartilhada        │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                         │
│  PostgreSQL │ Auth │ Storage │ Realtime │ RLS (tenant_id)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de dados

- **Leitura**: Server Component ou Client com TanStack Query → Server Action ou Route Handler → Service → Repository (Drizzle) → Supabase/Postgres.
- **Escrita**: Formulário → Server Action → validação Zod → Service → Repository → Postgres; auditoria via trigger ou application log.
- **Auth**: Supabase Auth (email/senha); sessão validada no middleware; `tenant_id` e `role` injetados no contexto.

---

## 4. Decisões tecnológicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| ORM | **Drizzle ORM** | Tipagem forte, SQL-like, performance, migrations explícitas, bom suporte a Supabase. |
| Formulários | **React Hook Form + Zod** | Menos re-renders, validação única (schema Zod reutilizado no backend). |
| Tabelas | **TanStack Table** | Headless, filtros, ordenação, paginação, acessibilidade. |
| Gráficos | **Recharts** | React-friendly, composable, adequado para dashboards. |
| Estado cliente | **Zustand** + **TanStack Query** | Zustand para UI/contexto leve; TanStack Query para dados servidor e cache. |
| UI | **Tailwind** + **componentes customizados** | Design system próprio (preto/laranja/branco), sem dependência de lib de componentes pesada; acessibilidade manual. |
| Data/hora | **date-fns** + **date-fns-tz** | Leve, imutável, suporte a timezone para múltiplas filiais. |
| Multi-tenant | **tenant_id em todas as tabelas** + **RLS** | Isolamento garantido no BD; aplicação sempre envia tenant. |

---

## 5. Fluxo dos perfis

- **Super Admin**: acesso a tenants, planos, suporte; sem restrição de tenant.
- **Admin/RH**: escopo ao tenant; CRUD organizacional, colaboradores, jornadas, fechamento, relatórios, aprovações.
- **Gestor**: mesmo tenant; leitura/aprovação limitada à sua equipe(s); dashboards da equipe.
- **Colaborador**: mesmo tenant; próprio ponto, espelho, justificativas, banco de horas.
- **Auditoria**: somente leitura em logs, espelhos, relatórios e trilhas; sem alteração de dados.

Permissões serão modeladas como `role` + `permissions` (granular por recurso e ação: create, read, update, delete, approve, etc.).

---

## 6. Estrutura de pastas (target)

```
src/
├── app/                    # App Router
│   ├── (auth)/             # login, recuperação de senha
│   ├── (dashboard)/        # layout com sidebar + topbar
│   │   ├── admin/
│   │   ├── gestor/
│   │   ├── colaborador/
│   │   └── auditoria/
│   ├── api/                # route handlers (webhooks, export, etc.)
│   └── layout.tsx
├── components/
│   ├── ui/                 # design system (Button, Input, Table, etc.)
│   ├── layout/             # Sidebar, Topbar, Breadcrumbs
│   ├── forms/              # formulários reutilizáveis
│   └── domain/             # por domínio (colaborador, jornada, ponto, etc.)
├── lib/
│   ├── db/                 # Drizzle schema, client, migrations
│   ├── auth/               # Supabase auth, middleware, getSession
│   ├── validations/        # schemas Zod compartilhados
│   ├── services/           # use cases (auth, employee, timeEntry, etc.)
│   ├── repositories/       # acesso a dados
│   ├── utils/              # date, format, constants
│   └── constants/          # roles, permissions, enums
├── stores/                 # Zustand
├── types/                  # tipos globais
└── styles/                 # globals.css, tokens
```

---

## 7. Próximos passos (ordem de implementação)

1. **Etapa 2**: Schema Drizzle completo, migrations, RLS policies, seeds.
2. **Etapa 3**: Auth (Supabase), middleware, server actions base, services e repositories principais.
3. **Etapa 4**: Design system, layout (sidebar/topbar), páginas de login, dashboards por perfil, CRUDs principais.
4. **Etapa 5**: Apuração de jornada, fechamento, espelho, relatórios e exportações.
5. **Etapa 6**: Testes unitários, integração e e2e.
6. **Etapa 7**: Variáveis de ambiente, build, deploy, observabilidade.

Este documento será mantido como referência central do projeto.
