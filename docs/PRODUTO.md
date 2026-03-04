# GRANIFY — Documento de Produto

> Versão 1.0 — 2026-03-04

---

## 1. Visão do Produto

O **GRANIFY** é uma plataforma SaaS de gestão financeira completa para pessoas físicas e pequenos negócios, disponível em Web, Android e iOS. Combina simplicidade de uso com recursos avançados de controle financeiro.

**Proposta de valor:** Tenha controle total das suas finanças — contas, cartões, metas e relatórios — em um lugar só, acessível de qualquer dispositivo.

---

## 2. Aplicações

| Plataforma | Tecnologia | Fase |
|---|---|---|
| Web (Chrome, Firefox, Edge, Opera) | Next.js 15 | Fase 1 |
| Android (nativo) | React Native / Expo | Fase 2 |
| iOS (nativo) | React Native / Expo | Fase 2 |

**Sincronização:** Banco de dados centralizado (PostgreSQL) — todas as plataformas compartilham os mesmos dados em tempo real.

---

## 3. Internacionalização

Todos os textos e strings da interface devem ser traduzíveis. Novas funcionalidades já devem vir com as 3 traduções.

| Idioma | Código | Status |
|---|---|---|
| Português-BR | `pt-BR` | ✅ Padrão |
| Inglês | `en` | ✅ Incluído |
| Espanhol | `es` | ✅ Incluído |

---

## 4. Funcionalidades e Estrutura de Páginas

### 4.1 Dashboard / Painel de Controle

Dashboard com **montagem dinâmica** de widgets. Usuário pode personalizar a disposição ou usar a configuração padrão. Filtros globais na parte superior se aplicam a todos os widgets.

**Filtros disponíveis:** Período (mês/ano, intervalo), Conta(s) selecionadas

**Widgets disponíveis:**
| Widget | Descrição |
|---|---|
| Fluxo de Caixa | Gráfico de entradas vs. saídas (por conta selecionada) |
| Saldos de Caixa | Cards com saldo atual por conta + total |
| Resultado do Mês | Receitas − Despesas = resultado |
| Despesas por Categoria | Gráfico de pizza/barra por categoria |
| Receitas por Categoria | Gráfico de pizza/barra por categoria |
| Metas | Progresso das metas de orçamento |
| Resultados de Caixa | Evolução do saldo ao longo do tempo |
| Últimos Lançamentos | Lista dos últimos N lançamentos |

---

### 4.2 Movimentações

#### Lançamentos
- Filtros avançados: data, conta, categoria, tipo (receita/despesa/transferência), status (confirmado/projetado), valor, descrição, tags
- Seleção de 1 ou mais contas — mostra CONFIRMADO e PROJETADO por conta + somatório
- Seleção individual de lançamentos para operações em lote
- Botão **ADICIONAR lançamento** (modal ou drawer)
- Suporte a lançamentos recorrentes e parcelados
- **Exportação:** PDF moderno, Excel (xlsx)

**Campos de um lançamento:**
- Data
- Descrição
- Valor
- Tipo: Receita / Despesa / Transferência
- Conta (origem / destino para transferências)
- Categoria
- Status: Confirmado / Projetado
- Cartão de crédito (opcional)
- Recorrência (Não recorrente / Semanal / Mensal / Anual)
- Parcelas (para parcelamentos)
- Observação
- Anexo (foto de comprovante)

#### Fluxo de Caixa
- Seleção de múltiplas contas
- Visualização em gráfico de barras (entradas vs. saídas por período)
- Filtro de período (mês, trimestre, ano, personalizado)

#### Contas a Pagar e Receber
- Lista separada de lançamentos com status PROJETADO
- Marcação rápida como pago/recebido
- Filtro por vencimento

#### Contas Pagas e Recebidas
- Histórico de lançamentos confirmados

---

### 4.3 Extrato de Contas
- Seleção de conta e período
- Lista cronológica de lançamentos
- Saldo inicial, saldo final, total de entradas e saídas
- Exportação em PDF e Excel

---

### 4.4 Cartões de Crédito

Gestão completa por cartão cadastrado.

**Estrutura:**
- Cartão principal com subcartões (Físico, Virtual, Adicional)
- Cada cartão tem: dia de fechamento, dia de vencimento, limite, cor
- A soma da fatura é lançada automaticamente na **DATA DE VENCIMENTO**

**Ações por fatura:**
- **Fechar fatura** — bloqueia novos lançamentos no período
- **Reabrir fatura** — permite edição
- **Lançar pagamento** — registra o pagamento da fatura na conta bancária vinculada

---

### 4.5 Metas

#### Metas de Orçamento
- Definição de valores-alvo por categoria (Despesas e/ou Receitas) para um período (mês/ano)
- Comparação entre meta e realizado com indicadores visuais
- Evolução histórica das metas vs. realizado

#### Metas de Economia
- Criação de objetivos de poupança (ex: "Férias", "Reserva de emergência")
- Registro de aportes com data e valor
- Progresso em barra + percentual atingido
- Data-alvo opcional

---

### 4.6 Relatórios

- Relatório de lançamentos por período/conta/categoria
- Relatório de resultado (receitas vs. despesas)
- Relatório de fluxo de caixa
- Relatório de categorias
- Todos com exportação em **PDF** (visual moderno) e **Excel**

---

### 4.7 Cadastros

#### Categorias
- CRUD completo com hierarquia (categoria → sub-categoria)
- Tipo: Receita / Despesa / Ambos
- Cor e ícone personalizáveis

#### Contas
- CRUD completo de contas financeiras
- Tipos: Conta Corrente, Poupança, Dinheiro, Investimento, Outros
- Saldo inicial configurável
- Moeda (padrão BRL)
- Opção de incluir ou não no saldo total

---

### 4.8 Regras de Preenchimento

- Regras automáticas: se a descrição do lançamento contém X → categoria Y, conta Z, descrição substituída
- Reduz trabalho repetitivo na categorização

---

### 4.9 Buscar Lançamentos

- Busca global por descrição, valor, categoria, conta, período
- Resultados em tempo real

---

### 4.10 Configurações da Conta

- Dados pessoais (nome, email, telefone, avatar)
- Alterar senha
- Preferências de idioma e moeda padrão
- **Planos** — upgrade/downgrade
- **API Tokens** — gerar e revogar tokens para acesso externo
- Preferências de notificação

---

### 4.11 Integrações Bancárias (Open Finance) — Fase 3

- Integração com Open Finance Brasil
- Importação automática de extratos bancários
- Conciliação automática de lançamentos

---

## 5. Planos e Preços

*Links Cakto a serem fornecidos pelo cliente.*

| Plano | Recursos |
|---|---|
| **Gratuito** | 1 conta, lançamentos básicos, sem exportação |
| **Pro** | Contas ilimitadas, cartões, metas, exportação PDF/Excel |
| **Business** | Tudo do Pro + API Tokens + Open Finance + suporte prioritário |

---

## 6. Segurança

- Login com email/senha (bcrypt)
- **SSO Google** (OAuth 2.0)
- JWT com expiração configurável
- Isolamento multi-tenant por `userId`
- API Tokens com escopo e expiração
- Todas as comunicações via HTTPS

---

## 7. Concorrentes Referência

| Produto | URL | Pontos de análise |
|---|---|---|
| Meu Dinheiro | https://www.meudinheiroweb.com.br/ | Interface, categorias |
| Mobills | https://www.mobills.com.br/ | Mobile first, metas |
| Visor | https://visorfinance.app | UX moderno |
| Minhas Economias | https://minhaseconomias.com.br/ | Funcionalidades |
| Conta Azul | https://contaazul.com/ | Business features |
| Organizze | https://www.organizze.com.br/ | Simplicidade |
| iDinheiro | https://app.idinheiro.com.br/ | Dashboard |
| Wisecash | https://wisecashapp.com.br/ | Fluxo de caixa |
| Fortuno | https://fortuno.app/ | Design |
| Lucrefy | https://lucrefy.com/ | Features avançadas |

---

## 8. Marketing — Landing Page

- Design de alta conversão, moderno e atrativo
- Seções: Hero, Features, Como funciona, Planos, Depoimentos, FAQ, CTA
- Integração com Cakto para pagamento (cartão, PIX)
- Links Cakto para cada plano (a definir)

---

*Documento mantido em `docs/PRODUTO.md` — GRANIFY*
