import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendPasswordChangedEmail } from '@/lib/email'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    const { token, password } = parsed.data

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!reset) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })
    }
    if (reset.usedAt) {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 400 })
    }
    if (reset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado. Solicite um novo link.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    await sendPasswordChangedEmail(reset.user.email, reset.user.name ?? 'Usuário')

    return NextResponse.json({ message: 'Senha redefinida com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
