import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, createSessionCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

function generateSlug(email: string): string {
  // "fabio.silva@gmail.com" => "fabio-silva"
  const local = email.split('@')[0]
  return local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let attempt = 0
  while (true) {
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    if (!existing) return slug
    attempt++
    slug = `${base}-${attempt}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados invalidos'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'E-mail ja cadastrado' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    // 1. Create User (tenantId null initially)
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    })

    // 2. Auto-create Tenant with slug derived from email
    const baseSlug = generateSlug(email)
    const slug = await uniqueSlug(baseSlug)

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const tenant = await prisma.tenant.create({
      data: {
        nome: name,
        slug,
        plano: 'free',
        planStatus: 'TRIAL',
        trialEndsAt,
        membros: { connect: { id: user.id } },
      },
    })

    // 3. Link User.tenantId = tenant.id
    await prisma.user.update({
      where: { id: user.id },
      data: { tenantId: tenant.id },
    })

    const token = await signToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      name: user.name,
    })
    const cookie = createSessionCookie(token)

    // Send welcome email async (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {})

    const res = NextResponse.json({ message: 'Conta criada com sucesso' }, { status: 201 })
    res.cookies.set(cookie)
    return res
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
