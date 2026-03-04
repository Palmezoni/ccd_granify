# GRANIFY — Documento de Arquitetura

> Versão 1.0 — 2026-03-04
> Status: Design Inicial

---

## 1. Visão Arquitetural

O **GRANIFY** é uma plataforma SaaS de gestão financeira pessoal e empresarial, organizada em três aplicações sincronizadas:

- **Web** (Next.js 15 — App Router)
- **Android** (React Native / Expo — Fase 2)
- **iOS** (React Native / Expo — Fase 2)

Prioridades arquiteturais:
- **Rapidez de desenvolvimento** (TypeScript end-to-end, mesma stack do MILHAS UP)
- **Multi-tenant por linha** (isolamento por `userId` em todas as queries)
- **Escalabilidade zero-cost** (Railway free tier → upgrade conforme crescimento)
- **Internacionalização nativa** (pt-BR, en, es desde o início com next-intl)
- **API REST completa** com autenticação por token para acesso externo

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript | SSR para landing page + SPA para o app |
| **UI Framework** | Tailwind CSS v4 + shadcn/ui | Design system moderno, customizável |
| **Estado** | Zustand + TanStack Query v5 | Cliente: UI state; Servidor: server state/cache |
| **Formulários** | React Hook Form + Zod | Validação type-safe |
| **Tabelas/Grids** | TanStack Table v8 | Sorting, filtering, pagination |
| **Gráficos** | Recharts | Fluxo de caixa, categorias, metas |
| **PDF** | jsPDF + jspdf-autotable | Relatórios e extratos |
| **Excel** | xlsx | Exportação de lançamentos |
| **i18n** | next-intl | pt-BR, en, es — base desde o início |
| **Backend** | Next.js Route Handlers | API integrada no mesmo projeto |
| **ORM** | Prisma 7 + @prisma/adapter-pg | Type-safe, migrações automatizadas |
| **Banco** | PostgreSQL | Dados financeiros relacionais |
| **Auth** | JWT customizado (jose + bcryptjs) | Session + JWT, SSO Google (OAuth2) |
| **E-mail** | Resend + React Email | Confirmação, recuperação de senha |
| **Pagamentos** | Cakto | Assinaturas (links fornecidos pelo cliente) |
| **Deploy** | Railway (app + PostgreSQL) | Mesmo servidor do MILHAS UP, zero-cost inicial |
| **Mobile (Fase 2)** | React Native + Expo | Compartilha tipos, lógica e API com web |

### Por que React Native para mobile (Fase 2)?
- Compartilha toda a camada de API e tipos TypeScript com o web
- Um único codebase para Android e iOS (verdadeiramente nativo via Expo)
- Integração com a mesma API REST já criada para o web
- Shared validations (Zod) e shared types

---

## 3. Estrutura do Repositório

```
ccd_granify/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── PRODUTO.md
│   └── ARQUITETURA.md          ← este arquivo
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── seed-admin.ts
├── src/
│   ├── app/
│   │   ├── (public)/           ← layout público
│   │   │   ├── page.tsx        ← landing page
│   │   │   ├── login/
│   │   │   └── cadastro/
│   │   ├── (app)/              ← layout autenticado (sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── movimentacoes/
│   │   │   │   ├── lancamentos/
│   │   │   │   ├── fluxo/
│   │   │   │   └── contas-pagar-receber/
│   │   │   ├── extrato/
│   │   │   ├── cartoes/
│   │   │   ├── metas/
│   │   │   │   ├── orcamento/
│   │   │   │   └── economia/
│   │   │   ├── relatorios/
│   │   │   ├── cadastros/
│   │   │   │   ├── categorias/
│   │   │   │   └── contas/
│   │   │   └── configuracoes/
│   │   └── api/
│   │       ├── auth/           ← login, register, google-oauth
│   │       ├── contas/
│   │       ├── lancamentos/
│   │       ├── cartoes/
│   │       ├── categorias/
│   │       ├── metas/
│   │       ├── relatorios/
│   │       └── webhooks/       ← Cakto
│   ├── components/
│   │   ├── ui/                 ← shadcn/ui
│   │   ├── layout/             ← Sidebar, Topbar, Shell
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── charts/
│   │   └── shared/
│   ├── i18n/
│   │   ├── request.ts
│   │   └── messages/
│   │       ├── pt-BR.json
│   │       ├── en.json
│   │       └── es.json
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── validations/
│   │   └── utils.ts
│   ├── hooks/
│   ├── stores/
│   └── types/
├── public/
├── prisma.config.ts
├── next.config.ts
├── railway.toml
├── nixpacks.toml
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## 4. Modelo de Dados (Schema Prisma)

Ver arquivo `prisma/schema.prisma` para o schema completo.

### Entidades Principais

| Entidade | Descrição |
|---|---|
| `User` | Usuário/tenant — isolamento por `userId` |
| `Account` / `Session` | NextAuth / OAuth |
| `Conta` | Conta financeira (corrente, poupança, dinheiro, investimento) |
| `CartaoCredito` | Cartão de crédito com vencimento e fechamento |
| `SubCartao` | Cartão físico, virtual, adicional |
| `FaturaCartao` | Fatura mensal do cartão |
| `Categoria` | Categoria de receita/despesa com sub-categorias |
| `Lancamento` | Lançamento financeiro (receita, despesa, transferência) |
| `Recorrencia` | Grupo de lançamentos recorrentes/parcelados |
| `Meta` | Meta de orçamento por categoria (mês/ano) |
| `MetaEconomia` | Meta de poupança com aportes |
| `AporteEconomia` | Aporte em meta de poupança |
| `RegraPreenchi` | Regra de auto-preenchimento de categoria |
| `ApiToken` | Token de acesso externo à API REST |
| `Notificacao` | Notificações in-app |

---

## 5. Rotas da Aplicação

### 5.1 Rotas Públicas
| Rota | Descrição |
|---|---|
| `/` | Landing page |
| `/login` | Login (email/senha + Google SSO) |
| `/cadastro` | Cadastro de novo usuário |
| `/login/recuperar-senha` | Recuperação de senha |

### 5.2 Rotas Autenticadas
| Rota | Módulo |
|---|---|
| `/dashboard` | Painel dinâmico com widgets |
| `/movimentacoes/lancamentos` | Lista de lançamentos com filtros |
| `/movimentacoes/fluxo` | Fluxo de caixa com gráficos |
| `/movimentacoes/contas-pagar-receber` | Contas a pagar e receber |
| `/extrato` | Extrato por conta |
| `/cartoes` | Gestão de cartões de crédito + faturas |
| `/metas/orcamento` | Metas de orçamento (despesas/receitas) |
| `/metas/economia` | Metas de poupança |
| `/relatorios` | Relatórios em PDF e Excel |
| `/cadastros/categorias` | CRUD de categorias |
| `/cadastros/contas` | CRUD de contas financeiras |
| `/configuracoes` | Configurações da conta, planos, API tokens |

### 5.3 API Routes (REST)
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/google
POST   /api/auth/recuperar-senha
GET    /api/contas               → lista contas do usuário
POST   /api/contas               → criar conta
GET    /api/contas/[id]          → detalhes
PUT    /api/contas/[id]          → atualizar
DELETE /api/contas/[id]          → excluir
GET    /api/lancamentos          → lista com filtros avançados
POST   /api/lancamentos          → criar lançamento
GET    /api/lancamentos/[id]
PUT    /api/lancamentos/[id]
DELETE /api/lancamentos/[id]
GET    /api/cartoes              → lista cartões
POST   /api/cartoes
GET    /api/cartoes/[id]/faturas → faturas do cartão
POST   /api/cartoes/[id]/faturas/fechar
POST   /api/cartoes/[id]/faturas/pagar
GET    /api/categorias
POST   /api/categorias
GET    /api/metas
POST   /api/metas
GET    /api/relatorios/fluxo     → com filtros de período e conta
GET    /api/relatorios/categorias
GET    /api/relatorios/resultado
GET    /api/tokens               → listar tokens de API
POST   /api/tokens               → gerar novo token
DELETE /api/tokens/[id]
POST   /api/webhooks/cakto       → webhook de pagamento
```

---

## 6. Internacionalização (next-intl)

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}))
```

Locales suportados: `pt-BR` (padrão), `en`, `es`

Toda string visível ao usuário deve usar `useTranslations()` ou `getTranslations()`.

---

## 7. Autenticação

### 7.1 Estratégia
- **JWT customizado** com `jose` (mesmo padrão do MILHAS UP)
- **Google OAuth 2.0** via rota `/api/auth/google`
- Middleware Next.js para proteger rotas `/dashboard/*` e `/api/*`

### 7.2 API Tokens (acesso externo)
- Usuário pode gerar tokens em `/configuracoes`
- Token é enviado no header `Authorization: Bearer <token>`
- Cada token tem escopo (read-only ou full) e data de expiração opcional

### 7.3 Multi-tenant
- Todas as queries Prisma filtram por `userId` — sem dados cruzados entre usuários
- Planos controlam acesso a features premium

---

## 8. Identidade Visual — GRANIFY

| Elemento | Escolha |
|---|---|
| **Cor primária** | Verde esmeralda (`#10B981`) — finanças, crescimento |
| **Cor secundária** | Azul (`#3B82F6`) — confiança, estabilidade |
| **Cor de fundo** | Cinza claro (`#F8FAFC`) |
| **Cor de erro** | Vermelho (`#EF4444`) — despesas, alertas |
| **Tipografia** | Inter (Google Fonts) |
| **Border radius** | `0.5rem` |
| **Ícones** | Lucide React |
| **Dark mode** | Suportado via next-themes |

### Layout do App (Área Autenticada)
```
┌─────────────────────────────────────────────────────────┐
│ TOPBAR: [Logo GRANIFY] [Filtros Globais] [Notif] [User] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   SIDEBAR    │           CONTEÚDO PRINCIPAL             │
│   (240px)    │                                          │
│              │  ┌─────────────────────────────────────┐ │
│  Dashboard   │  │ Breadcrumb / Título                  │ │
│  ─────────   │  └─────────────────────────────────────┘ │
│  Moviment.   │                                          │
│   ► Lanç.    │  ┌─────────────────────────────────────┐ │
│   ► Fluxo    │  │                                      │ │
│   ► A P/R    │  │          CONTEÚDO                    │ │
│  ─────────   │  │                                      │ │
│  Extrato     │  │                                      │ │
│  Cartões     │  └─────────────────────────────────────┘ │
│  ─────────   │                                          │
│  Metas       │                                          │
│  Relatórios  │                                          │
│  ─────────   │                                          │
│  Cadastros   │                                          │
│  Configurações│                                         │
└──────────────┴──────────────────────────────────────────┘
```

---

## 9. Infraestrutura e Deploy

### 9.1 Ambientes
| Ambiente | URL | Banco |
|---|---|---|
| Desenvolvimento | `localhost:3000` | PostgreSQL local (Docker) |
| Produção | `*.up.railway.app` → domínio final | Railway PostgreSQL (mesmo servidor MILHAS UP) |

### 9.2 Variáveis de Ambiente
Ver `.env.example` para lista completa.

### 9.3 Deploy (Railway)
- Build: nixpacks (Node 24 + pnpm + openssl)
- Start: `npm start` (com `prisma db push` no Dockerfile)
- Health check: `GET /`

---

## 10. Background Jobs (futuro)

| Job | Trigger | Ação |
|---|---|---|
| `verificar-contas-vencer` | Cron diário 08:00 | Notifica contas a pagar próximas |
| `fechar-faturas` | Cron diário | Fecha faturas no dia de fechamento |
| `enviar-email` | Event-driven | E-mails transacionais |
| `renovar-plano` | Webhook Cakto | Atualiza status do plano |

---

## 11. Fases de Desenvolvimento

### Fase 1 — Fundação Web (Semanas 1–2)
- [ ] Setup completo (Next.js + Tailwind + shadcn + Prisma + i18n)
- [ ] Autenticação JWT + Google SSO
- [ ] Layout do app (sidebar, topbar, dark mode)
- [ ] CRUD de Contas financeiras
- [ ] CRUD de Categorias (com sub-categorias)

### Fase 2 — Core Financeiro (Semanas 3–4)
- [ ] Dashboard com widgets configuráveis
- [ ] Lançamentos (receita, despesa, transferência)
- [ ] Lançamentos recorrentes e parcelados
- [ ] Fluxo de caixa com gráficos
- [ ] Saldos por conta

### Fase 3 — Cartões de Crédito (Semana 5)
- [ ] CRUD de cartões (físico, virtual, adicional)
- [ ] Gestão de faturas (fechar, reabrir, pagar)
- [ ] Lançamentos na fatura

### Fase 4 — Metas (Semana 6)
- [ ] Metas de orçamento por categoria
- [ ] Metas de poupança com aportes
- [ ] Widgets de metas no dashboard

### Fase 5 — Relatórios e Exportação (Semana 7)
- [ ] Relatórios em PDF
- [ ] Exportação em Excel
- [ ] Extrato por conta
- [ ] Contas a pagar e receber

### Fase 6 — Extras (Semanas 8–9)
- [ ] Regras de preenchimento automático
- [ ] API Tokens (acesso externo)
- [ ] Open Finance (integração bancária — pesquisar APIs disponíveis)
- [ ] Busca global de lançamentos

### Fase 7 — Monetização e Landing Page (Semanas 10–11)
- [ ] Landing page de alta conversão
- [ ] Integração Cakto (assinaturas)
- [ ] Deploy definitivo com domínio

### Fase 8 — Mobile (Fase 2)
- [ ] Setup Expo + React Native
- [ ] Reutilizar API REST e tipos TypeScript
- [ ] App Android e iOS com paridade de features

---

*Documento mantido em `docs/ARQUITETURA.md` — GRANIFY*
