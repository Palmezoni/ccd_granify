# GRANIFY — Plataforma de Gestão Financeira

Plataforma SaaS de gestão financeira pessoal e empresarial. Web + Mobile (Android/iOS).

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS v4 + shadcn/ui
- **ORM:** Prisma 7 + PostgreSQL
- **Auth:** JWT customizado + Google SSO
- **i18n:** next-intl (pt-BR, en, es)
- **Deploy:** Railway

## Início Rápido

```bash
# Instalar dependências
pnpm install

# Subir banco de dados local (porta 5433)
docker-compose up -d

# Configurar variáveis de ambiente
cp .env.example .env.local

# Aplicar schema
npx prisma db push

# Rodar em desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Documentação

- [Arquitetura](docs/ARQUITETURA.md)
- [Produto](docs/PRODUTO.md)
