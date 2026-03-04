/**
 * seed-demo.ts — Popula dados fictícios para admin@granify.net
 * Cobre Jan/2025 → Mar/2026 com padrões realistas de finanças pessoais BR
 *
 * Executar: pnpm tsx prisma/seed-demo.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── helpers ─────────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0)
}

function rnd(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min
  return parseFloat(v.toFixed(decimals))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de dados demo para admin@granify.net...\n')

  // ── Localizar usuário admin ──────────────────────────────────────────────

  const admin = await prisma.user.findUnique({ where: { email: 'admin@granify.net' } })
  if (!admin || !admin.tenantId) {
    throw new Error('Usuário admin@granify.net não encontrado. Rode o seed principal primeiro.')
  }
  const { id: userId, tenantId } = admin
  console.log(`✓ Usuário: ${admin.email} | tenant: ${tenantId}`)

  // ── Limpar dados antigos de demo (exceto categorias e o próprio usuário) ──

  console.log('  Removendo dados anteriores...')
  await prisma.lancamento.deleteMany({ where: { userId, tenantId } })
  await prisma.metaEconomia.deleteMany({ where: { userId, tenantId } })
  await prisma.meta.deleteMany({ where: { userId, tenantId } })
  await prisma.conta.deleteMany({ where: { userId, tenantId } })
  console.log('  ✓ Dados anteriores removidos\n')

  // ── Categorias (buscar as existentes) ────────────────────────────────────

  const cats = await prisma.categoria.findMany({ where: { userId, tenantId } })
  const cat = (nome: string) => cats.find(c => c.nome === nome)?.id ?? null

  // ── Contas ───────────────────────────────────────────────────────────────

  console.log('  Criando contas...')

  const contaCorrente = await prisma.conta.create({
    data: {
      tenantId, userId,
      nome: 'Nubank — Conta',
      tipo: 'CORRENTE',
      saldoInicial: 1200,
      cor: '#8b5cf6',
      icone: '💜',
      incluirTotal: true,
      ativa: true,
      ordem: 1,
    },
  })

  const contaPoupanca = await prisma.conta.create({
    data: {
      tenantId, userId,
      nome: 'Caixa — Poupança',
      tipo: 'POUPANCA',
      saldoInicial: 8000,
      cor: '#0ea5e9',
      icone: '🏦',
      incluirTotal: true,
      ativa: true,
      ordem: 2,
    },
  })

  const contaCarteira = await prisma.conta.create({
    data: {
      tenantId, userId,
      nome: 'Carteira (Dinheiro)',
      tipo: 'DINHEIRO',
      saldoInicial: 350,
      cor: '#10b981',
      icone: '💵',
      incluirTotal: true,
      ativa: true,
      ordem: 3,
    },
  })

  const contaInvest = await prisma.conta.create({
    data: {
      tenantId, userId,
      nome: 'XP — Investimentos',
      tipo: 'INVESTIMENTO',
      saldoInicial: 42000,
      cor: '#f59e0b',
      icone: '📈',
      incluirTotal: false, // não soma no total
      ativa: true,
      ordem: 4,
    },
  })

  console.log('  ✓ 4 contas criadas\n')

  // ── Metas de Economia ────────────────────────────────────────────────────

  console.log('  Criando metas de economia...')

  const metaViagem = await prisma.metaEconomia.create({
    data: {
      tenantId, userId,
      nome: 'Viagem para Europa',
      valorAlvo: 32000,
      valorAtual: 14500,
      dataAlvo: new Date(2026, 11, 1),
      cor: '#6366f1',
      icone: '✈️',
      status: 'EM_ANDAMENTO',
    },
  })

  const metaEmergencia = await prisma.metaEconomia.create({
    data: {
      tenantId, userId,
      nome: 'Reserva de Emergência',
      valorAlvo: 50000,
      valorAtual: 28000,
      dataAlvo: new Date(2026, 5, 1),
      cor: '#f43f5e',
      icone: '🛡️',
      status: 'EM_ANDAMENTO',
    },
  })

  // Meta já concluída
  await prisma.metaEconomia.create({
    data: {
      tenantId, userId,
      nome: 'Notebook Novo',
      valorAlvo: 14000,
      valorAtual: 14000,
      dataAlvo: new Date(2025, 6, 1),
      cor: '#94a3b8',
      icone: '💻',
      status: 'CONCLUIDA',
    },
  })

  console.log('  ✓ 3 metas de economia criadas\n')

  // ── Lançamentos — gerador por mês ───────────────────────────────────────

  console.log('  Gerando lançamentos (Jan/2025 → Mar/2026)...')

  const lancamentos: Parameters<typeof prisma.lancamento.createMany>[0]['data'] = []

  // Meses a gerar: Jan/2025 a Mar/2026
  const meses: { year: number; month: number }[] = []
  for (let m = 1; m <= 12; m++) meses.push({ year: 2025, month: m })
  meses.push({ year: 2026, month: 1 })
  meses.push({ year: 2026, month: 2 })
  meses.push({ year: 2026, month: 3 }) // mês atual parcial

  for (const { year, month } of meses) {
    const isMarchCurrent = year === 2026 && month === 3
    const lastDay = isMarchCurrent ? 4 : new Date(year, month, 0).getDate() // até dia 4 em mar/26

    // ── RECEITAS ──────────────────────────────────────────────────────────

    // Salário (dia 5)
    const salario = rnd(8200, 8800)
    lancamentos.push({
      tenantId, userId,
      tipo: 'RECEITA',
      descricao: 'Salário',
      valor: salario,
      data: d(year, month, 5),
      categoriaId: cat('Salario'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // 13º em dezembro
    if (month === 12) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'RECEITA',
        descricao: '13º Salário',
        valor: rnd(8000, 8500),
        data: d(year, month, 20),
        categoriaId: cat('Salario'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Freelance (50% de chance, todo mês exceto dez e jan)
    if (month !== 12 && month !== 1 && Math.random() > 0.45) {
      const freela = rnd(1200, 4500)
      lancamentos.push({
        tenantId, userId,
        tipo: 'RECEITA',
        descricao: pick(['Projeto Web', 'Consultoria Digital', 'Design UI', 'Dev App', 'Projeto React']),
        valor: freela,
        data: d(year, month, rnd(10, 25, 0)),
        categoriaId: cat('Freelance'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Rendimentos de investimento (mensal)
    lancamentos.push({
      tenantId, userId,
      tipo: 'RECEITA',
      descricao: 'Rendimento CDB/Tesouro',
      valor: rnd(350, 620),
      data: d(year, month, lastDay),
      categoriaId: cat('Rendimentos'),
      contaId: contaInvest.id,
      status: 'CONFIRMADO',
    })

    // ── DESPESAS FIXAS ────────────────────────────────────────────────────

    // Aluguel (dia 10)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: 2200,
      data: d(year, month, 10),
      categoriaId: cat('Moradia'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Condomínio (dia 10)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Condomínio',
      valor: 580,
      data: d(year, month, 10),
      categoriaId: cat('Moradia'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Internet (dia 15)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Claro — Internet Fibra',
      valor: 99.9,
      data: d(year, month, 15),
      categoriaId: cat('Contas e Servicos'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Celular (dia 20)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Tim — Plano Celular',
      valor: 59.99,
      data: d(year, month, 20),
      categoriaId: cat('Contas e Servicos'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Energia / Água (dia 12)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Energia Elétrica',
      valor: rnd(180, 340),
      data: d(year, month, 12),
      categoriaId: cat('Contas e Servicos'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Água / Gás',
      valor: rnd(80, 140),
      data: d(year, month, 12),
      categoriaId: cat('Contas e Servicos'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Assinaturas
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Netflix',
      valor: 39.9,
      data: d(year, month, 8),
      categoriaId: cat('Assinaturas'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Spotify',
      valor: 21.9,
      data: d(year, month, 8),
      categoriaId: cat('Assinaturas'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Adobe Creative Cloud',
      valor: 89.9,
      data: d(year, month, 14),
      categoriaId: cat('Assinaturas'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Plano de saúde (dia 10)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Unimed — Plano de Saúde',
      valor: 420,
      data: d(year, month, 10),
      categoriaId: cat('Saude'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // Academia (dia 5)
    lancamentos.push({
      tenantId, userId,
      tipo: 'DESPESA',
      descricao: 'Smart Fit — Academia',
      valor: 99.9,
      data: d(year, month, 5),
      categoriaId: cat('Saude'),
      contaId: contaCorrente.id,
      status: 'CONFIRMADO',
    })

    // ── DESPESAS VARIÁVEIS ────────────────────────────────────────────────

    // Supermercado (3–4x por mês)
    const numSuper = Math.floor(rnd(3, 4, 0))
    for (let i = 0; i < numSuper; i++) {
      const diaSuper = Math.floor(rnd(1, Math.min(lastDay, 28), 0))
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Pão de Açúcar', 'Extra Supermercados', 'Carrefour', 'Atacadão', 'Mercado Local']),
        valor: rnd(180, 480),
        data: d(year, month, diaSuper),
        categoriaId: cat('Alimentacao'),
        contaId: pick([contaCorrente.id, contaCarteira.id]),
        status: 'CONFIRMADO',
      })
    }

    // Restaurantes / iFood (4–8x por mês)
    const numRest = Math.floor(rnd(4, 8, 0))
    for (let i = 0; i < numRest; i++) {
      const diaRest = Math.floor(rnd(1, Math.min(lastDay, 28), 0))
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['iFood', 'Restaurante Almoço', 'Pizzaria', 'Lanchonete', 'Sushi', 'Hambúrguer', 'Padaria', 'Café']),
        valor: rnd(22, 95),
        data: d(year, month, diaRest),
        categoriaId: cat('Alimentacao'),
        contaId: pick([contaCorrente.id, contaCarteira.id]),
        status: 'CONFIRMADO',
      })
    }

    // Gasolina / Uber (2–3x)
    const numTransp = Math.floor(rnd(3, 6, 0))
    for (let i = 0; i < numTransp; i++) {
      const diaT = Math.floor(rnd(1, Math.min(lastDay, 28), 0))
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Gasolina', 'Uber', '99 Taxi', 'Estacionamento', 'Pedágio']),
        valor: rnd(35, 180),
        data: d(year, month, diaT),
        categoriaId: cat('Transporte'),
        contaId: pick([contaCorrente.id, contaCarteira.id]),
        status: 'CONFIRMADO',
      })
    }

    // Farmácia / Médico (1–2x, variável)
    if (Math.random() > 0.3) {
      const diaS = Math.floor(rnd(1, Math.min(lastDay, 28), 0))
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Farmácia', 'Consulta Médica', 'Exames Lab', 'Dentista', 'Remédios']),
        valor: rnd(45, 350),
        data: d(year, month, diaS),
        categoriaId: cat('Saude'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Lazer (cinema, streaming, eventos)
    const numLazer = Math.floor(rnd(1, 4, 0))
    for (let i = 0; i < numLazer; i++) {
      const diaL = Math.floor(rnd(1, Math.min(lastDay, 28), 0))
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Cinema', 'Show / Evento', 'Bar / Balada', 'Jogo PS5', 'Steam', 'Parque de Diversões', 'Passeio']),
        valor: rnd(40, 220),
        data: d(year, month, diaL),
        categoriaId: cat('Lazer'),
        contaId: pick([contaCorrente.id, contaCarteira.id]),
        status: 'CONFIRMADO',
      })
    }

    // ── SAZONAIS ─────────────────────────────────────────────────────────

    // Janeiro: IPVA, IPTU (parcelado)
    if (month === 1) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPVA 2025 — Parcela 1/3',
        valor: 980,
        data: d(year, month, 15),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPTU 2025 — Parcela 1/5',
        valor: 340,
        data: d(year, month, 20),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Fevereiro: Carnaval + IPVA 2/3
    if (month === 2) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPVA 2025 — Parcela 2/3',
        valor: 980,
        data: d(year, month, 15),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Carnaval — Hotel + Ingressos',
        valor: rnd(800, 1600),
        data: d(year, month, rnd(10, 18, 0)),
        categoriaId: cat('Lazer'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Março: IPVA 3/3
    if (month === 3 && year === 2025) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPVA 2025 — Parcela 3/3',
        valor: 980,
        data: d(year, month, 15),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Maio: Dia das Mães
    if (month === 5) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Presente Dia das Mães',
        valor: rnd(180, 420),
        data: d(year, month, 11),
        categoriaId: cat('Presentes'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Junho: Festa Junina + IPTU
    if (month === 6) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Festa Junina / São João',
        valor: rnd(120, 280),
        data: d(year, month, 22),
        categoriaId: cat('Lazer'),
        contaId: contaCarteira.id,
        status: 'CONFIRMADO',
      })
    }

    // Julho: férias / viagem nacional
    if (month === 7 && year === 2025) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Passagens Aéreas — Férias',
        valor: rnd(1200, 2800),
        data: d(year, month, 5),
        categoriaId: cat('Lazer'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Hotel Férias',
        valor: rnd(1800, 3500),
        data: d(year, month, 12),
        categoriaId: cat('Lazer'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Agosto: Dia dos Pais
    if (month === 8) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Presente Dia dos Pais',
        valor: rnd(150, 380),
        data: d(year, month, 10),
        categoriaId: cat('Presentes'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Novembro: Black Friday
    if (month === 11) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Black Friday — Roupas/Tênis',
        valor: rnd(400, 900),
        data: d(year, month, 29),
        categoriaId: cat('Vestuario'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Black Friday — Eletrônicos',
        valor: rnd(600, 1400),
        data: d(year, month, 29),
        categoriaId: cat('Outros Gastos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Dezembro: Natal, presentes, ceia
    if (month === 12) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Presentes de Natal',
        valor: rnd(600, 1200),
        data: d(year, month, 20),
        categoriaId: cat('Presentes'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Ceia de Natal / Ano Novo',
        valor: rnd(380, 650),
        data: d(year, month, 24),
        categoriaId: cat('Alimentacao'),
        contaId: contaCarteira.id,
        status: 'CONFIRMADO',
      })
      // Vestuário para as festas
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Roupa para Festas',
        valor: rnd(250, 580),
        data: d(year, month, 18),
        categoriaId: cat('Vestuario'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Janeiro 2026: IPVA novamente
    if (month === 1 && year === 2026) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPVA 2026 — Parcela 1/3',
        valor: 1050,
        data: d(year, month, 15),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPTU 2026 — Parcela 1/5',
        valor: 360,
        data: d(year, month, 20),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // Fevereiro 2026: Carnaval
    if (month === 2 && year === 2026) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'IPVA 2026 — Parcela 2/3',
        valor: 1050,
        data: d(year, month, 15),
        categoriaId: cat('Contas e Servicos'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // ── VESTUÁRIO (trimestral) ─────────────────────────────────────────────
    if ([3, 6, 9].includes(month) || (year === 2026 && month === 3)) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Renner', 'Zara', 'C&A', 'Riachuelo', 'Nike Store', 'Farm', 'Netshoes']),
        valor: rnd(160, 420),
        data: d(year, month, rnd(5, Math.min(lastDay, 25), 0)),
        categoriaId: cat('Vestuario'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // ── EDUCAÇÃO (semestral) ──────────────────────────────────────────────
    if ([3, 9].includes(month) || (year === 2026 && month === 3)) {
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: pick(['Udemy — Cursos', 'Alura', 'Livros técnicos', 'DIO / Rocketseat', 'Pós-graduação']),
        valor: rnd(120, 890),
        data: d(year, month, rnd(5, Math.min(lastDay, 20), 0)),
        categoriaId: cat('Educacao'),
        contaId: contaCorrente.id,
        status: 'CONFIRMADO',
      })
    }

    // ── TRANSFERÊNCIA para poupança / investimento (mensal) ──────────────
    if (!isMarchCurrent || month < 3) {
      // Transferência poupança
      lancamentos.push({
        tenantId, userId,
        tipo: 'TRANSFERENCIA',
        descricao: 'Reserva mensal — Poupança',
        valor: rnd(800, 1500),
        data: d(year, month, 28),
        contaId: contaCorrente.id,
        contaDestinoId: contaPoupanca.id,
        status: 'CONFIRMADO',
      })

      // Aporte em investimento (nem todo mês)
      if (Math.random() > 0.4) {
        lancamentos.push({
          tenantId, userId,
          tipo: 'TRANSFERENCIA',
          descricao: 'Aporte — CDB / Tesouro Direto',
          valor: rnd(500, 2000),
          data: d(year, month, 29),
          contaId: contaCorrente.id,
          contaDestinoId: contaInvest.id,
          status: 'CONFIRMADO',
        })
      }
    }

    // ── PROJETADOS do mês atual (mar/2026) ────────────────────────────────
    if (isMarchCurrent) {
      // Contas fixas do mês atual que já venceram mas ainda não foram pagas
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Aluguel',
        valor: 2200,
        data: d(year, month, 10),
        categoriaId: cat('Moradia'),
        contaId: contaCorrente.id,
        status: 'PROJETADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Condomínio',
        valor: 580,
        data: d(year, month, 10),
        categoriaId: cat('Moradia'),
        contaId: contaCorrente.id,
        status: 'PROJETADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'DESPESA',
        descricao: 'Unimed — Plano de Saúde',
        valor: 420,
        data: d(year, month, 10),
        categoriaId: cat('Saude'),
        contaId: contaCorrente.id,
        status: 'PROJETADO',
      })
      lancamentos.push({
        tenantId, userId,
        tipo: 'RECEITA',
        descricao: 'Salário (previsão)',
        valor: rnd(8200, 8800),
        data: d(year, month, 5),
        categoriaId: cat('Salario'),
        contaId: contaCorrente.id,
        status: 'PROJETADO',
      })
    }

    process.stdout.write(`  → ${year}/${String(month).padStart(2, '0')} gerado (${lancamentos.length} total)\r`)
  }

  // ── Inserir em batches ────────────────────────────────────────────────────

  console.log('\n\n  Inserindo lançamentos no banco...')
  const BATCH = 50
  for (let i = 0; i < lancamentos.length; i += BATCH) {
    await prisma.lancamento.createMany({ data: lancamentos.slice(i, i + BATCH) })
  }

  console.log(`  ✓ ${lancamentos.length} lançamentos inseridos\n`)

  // ── Aportes nas metas de economia ────────────────────────────────────────

  console.log('  Criando aportes nas metas...')

  // Viagem Europa — aportes ao longo de 2025/2026
  const aportesViagem = [
    { mes: 3, valor: 1000 }, { mes: 5, valor: 1500 }, { mes: 7, valor: 2000 },
    { mes: 9, valor: 1000 }, { mes: 11, valor: 1500 }, { mes: 3, valor: 3000, y: 2025 },
    { mes: 1, valor: 1500, y: 2026 }, { mes: 2, valor: 2000, y: 2026 },
  ]
  for (const a of aportesViagem) {
    const yr = a.y ?? 2025
    await prisma.aporteEconomia.create({
      data: {
        metaId: metaViagem.id,
        valor: a.valor,
        data: d(yr, a.mes, 28),
        descricao: 'Aporte programado',
      },
    })
  }

  // Reserva de Emergência — aportes mensais desde jan/2025
  for (let m = 1; m <= 12; m++) {
    await prisma.aporteEconomia.create({
      data: {
        metaId: metaEmergencia.id,
        valor: rnd(1800, 2200),
        data: d(2025, m, 28),
        descricao: 'Aporte mensal',
      },
    })
  }
  await prisma.aporteEconomia.create({
    data: { metaId: metaEmergencia.id, valor: 2000, data: d(2026, 1, 28), descricao: 'Aporte mensal' },
  })
  await prisma.aporteEconomia.create({
    data: { metaId: metaEmergencia.id, valor: 2000, data: d(2026, 2, 28), descricao: 'Aporte mensal' },
  })

  console.log('  ✓ Aportes criados\n')

  // ── Resumo final ──────────────────────────────────────────────────────────

  const totalLanc = await prisma.lancamento.count({ where: { userId, tenantId } })
  const totalContas = await prisma.conta.count({ where: { userId, tenantId } })
  const totalMetas = await prisma.metaEconomia.count({ where: { userId, tenantId } })

  console.log('✅ Seed demo concluído!')
  console.log(`   Lançamentos: ${totalLanc}`)
  console.log(`   Contas: ${totalContas}`)
  console.log(`   Metas de Economia: ${totalMetas}`)
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
