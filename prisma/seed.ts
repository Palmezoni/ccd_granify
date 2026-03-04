import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CATEGORIAS_PADRAO = [
  // DESPESAS
  { nome: 'Alimentacao', tipo: 'DESPESA' as const, cor: '#ef4444', icone: '🍔' },
  { nome: 'Moradia', tipo: 'DESPESA' as const, cor: '#f97316', icone: '🏠' },
  { nome: 'Transporte', tipo: 'DESPESA' as const, cor: '#eab308', icone: '🚗' },
  { nome: 'Saude', tipo: 'DESPESA' as const, cor: '#ec4899', icone: '💊' },
  { nome: 'Educacao', tipo: 'DESPESA' as const, cor: '#8b5cf6', icone: '📚' },
  { nome: 'Lazer', tipo: 'DESPESA' as const, cor: '#06b6d4', icone: '🎬' },
  { nome: 'Vestuario', tipo: 'DESPESA' as const, cor: '#84cc16', icone: '👕' },
  { nome: 'Contas e Servicos', tipo: 'DESPESA' as const, cor: '#64748b', icone: '💡' },
  { nome: 'Assinaturas', tipo: 'DESPESA' as const, cor: '#6366f1', icone: '📱' },
  { nome: 'Investimentos', tipo: 'DESPESA' as const, cor: '#14b8a6', icone: '📈' },
  { nome: 'Presentes', tipo: 'DESPESA' as const, cor: '#f43f5e', icone: '🎁' },
  { nome: 'Outros Gastos', tipo: 'DESPESA' as const, cor: '#94a3b8', icone: '📦' },
  // RECEITAS
  { nome: 'Salario', tipo: 'RECEITA' as const, cor: '#10b981', icone: '💰' },
  { nome: 'Freelance', tipo: 'RECEITA' as const, cor: '#3b82f6', icone: '💼' },
  { nome: 'Rendimentos', tipo: 'RECEITA' as const, cor: '#22c55e', icone: '📊' },
  { nome: 'Reembolsos', tipo: 'RECEITA' as const, cor: '#a3e635', icone: '↩️' },
  { nome: 'Outras Receitas', tipo: 'RECEITA' as const, cor: '#34d399', icone: '✨' },
]

function generateSlug(email: string): string {
  const local = email.split('@')[0]
  return local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

async function seedUser(
  email: string,
  nome: string,
  senha: string,
  role: 'USER' | 'ADMIN',
  planStatus: 'TRIAL' | 'ACTIVE',
  tenantSlug: string,
) {
  // Create or find tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        nome,
        slug: tenantSlug,
        plano: 'free',
        planStatus,
      },
    })
  }

  // Create or find user
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  User already exists: ${email}`)
    // Ensure tenantId is set
    if (!existing.tenantId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { tenantId: tenant.id },
      })
    }
    return existing
  }

  const passwordHash = await bcrypt.hash(senha, 12)
  const user = await prisma.user.create({
    data: {
      name: nome,
      email,
      password: passwordHash,
      role,
      planStatus,
      tenantId: tenant.id,
    },
  })

  // Seed default categories
  for (const cat of CATEGORIAS_PADRAO) {
    await prisma.categoria.create({
      data: { tenantId: tenant.id, userId: user.id, ...cat },
    })
  }

  return user
}

async function main() {
  console.log('Iniciando seed...')

  // Admin user
  const admin = await seedUser(
    'admin@granify.net',
    'Admin Granify',
    'granify',
    'ADMIN',
    'ACTIVE',
    'admin-granify',
  )
  if (admin) console.log('Admin criado: admin@granify.net / granify')

  // Demo user
  const demo = await seedUser(
    'demo@granify.net',
    'Usuario Demo',
    'demo123456',
    'USER',
    'ACTIVE',
    'usuario-demo',
  )
  if (demo) {
    const demoContaExists = await prisma.conta.findFirst({ where: { userId: demo.id } })
    if (!demoContaExists && demo.tenantId) {
      await prisma.conta.create({
        data: {
          tenantId: demo.tenantId,
          userId: demo.id,
          nome: 'Conta Corrente',
          tipo: 'CORRENTE',
          saldoInicial: 5000,
          cor: '#10b981',
          icone: '🏦',
        },
      })
    }
    console.log('Demo criado: demo@granify.net / demo123456')
  }

  console.log('Seed concluido.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
