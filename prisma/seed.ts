import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CATEGORIAS_PADRAO = [
  // DESPESAS
  { nome: 'Alimentação', tipo: 'DESPESA' as const, cor: '#ef4444', icone: '🍔' },
  { nome: 'Moradia', tipo: 'DESPESA' as const, cor: '#f97316', icone: '🏠' },
  { nome: 'Transporte', tipo: 'DESPESA' as const, cor: '#eab308', icone: '🚗' },
  { nome: 'Saúde', tipo: 'DESPESA' as const, cor: '#ec4899', icone: '💊' },
  { nome: 'Educação', tipo: 'DESPESA' as const, cor: '#8b5cf6', icone: '📚' },
  { nome: 'Lazer', tipo: 'DESPESA' as const, cor: '#06b6d4', icone: '🎬' },
  { nome: 'Vestuário', tipo: 'DESPESA' as const, cor: '#84cc16', icone: '👕' },
  { nome: 'Contas & Serviços', tipo: 'DESPESA' as const, cor: '#64748b', icone: '💡' },
  { nome: 'Assinaturas', tipo: 'DESPESA' as const, cor: '#6366f1', icone: '📱' },
  { nome: 'Investimentos', tipo: 'DESPESA' as const, cor: '#14b8a6', icone: '📈' },
  { nome: 'Presentes', tipo: 'DESPESA' as const, cor: '#f43f5e', icone: '🎁' },
  { nome: 'Outros Gastos', tipo: 'DESPESA' as const, cor: '#94a3b8', icone: '📦' },
  // RECEITAS
  { nome: 'Salário', tipo: 'RECEITA' as const, cor: '#10b981', icone: '💰' },
  { nome: 'Freelance', tipo: 'RECEITA' as const, cor: '#3b82f6', icone: '💼' },
  { nome: 'Rendimentos', tipo: 'RECEITA' as const, cor: '#22c55e', icone: '📊' },
  { nome: 'Reembolsos', tipo: 'RECEITA' as const, cor: '#a3e635', icone: '↩️' },
  { nome: 'Outras Receitas', tipo: 'RECEITA' as const, cor: '#34d399', icone: '✨' },
]

async function main() {
  console.log('🌱 Iniciando seed...')

  // Create demo user if not exists
  const demoEmail = 'demo@granify.app'
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!existing) {
    const passwordHash = await bcrypt.hash('demo123456', 12)
    const demoUser = await prisma.user.create({
      data: {
        name: 'Usuário Demo',
        email: demoEmail,
        password: passwordHash,
      },
    })

    // Create default categories for demo user
    for (const cat of CATEGORIAS_PADRAO) {
      await prisma.categoria.create({
        data: { userId: demoUser.id, ...cat },
      })
    }

    // Create a demo account
    await prisma.conta.create({
      data: {
        userId: demoUser.id,
        nome: 'Conta Corrente',
        tipo: 'CORRENTE',
        saldoInicial: 5000,
        cor: '#10b981',
        icone: '🏦',
      },
    })

    console.log(`✅ Usuário demo criado: ${demoEmail} / demo123456`)
  } else {
    console.log(`ℹ️  Usuário demo já existe: ${demoEmail}`)
  }

  console.log('✅ Seed concluído.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
