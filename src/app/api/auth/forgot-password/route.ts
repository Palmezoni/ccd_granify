import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' })
    }

    // Delete existing tokens for this user
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    })

    await sendPasswordResetEmail(email, user.name ?? 'Usuário', token)

    return NextResponse.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
