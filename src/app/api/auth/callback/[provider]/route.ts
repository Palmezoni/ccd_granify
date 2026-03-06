// src/app/api/auth/callback/[provider]/route.ts
// Recebe o callback OAuth, troca o code por tokens, e encontra/cria o usuário
// GET → Google e Microsoft | POST → Apple (response_mode=form_post)
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { signToken, createSessionCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import {
  OAuthProvider,
  OAuthUserInfo,
  googleExchangeCode,
  googleGetUser,
  microsoftExchangeCode,
  microsoftGetUser,
  appleExchangeCode,
  appleDecodeIdToken,
} from '@/lib/oauth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

// ─── Slug helpers (mesmo padrão do register) ──────────────────────────────────

function generateSlug(email: string): string {
  return email
    .split('@')[0]
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

// ─── Encontra ou cria usuário via OAuth ───────────────────────────────────────

type TokenData = {
  access_token: string
  id_token?: string
  refresh_token?: string
  expires_in?: number
}

async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  userInfo: OAuthUserInfo,
  tokenData: TokenData
) {
  // 1. Conta OAuth já vinculada?
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: userInfo.id,
      },
    },
    include: { user: true },
  })

  if (existingAccount) {
    // Atualiza tokens
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        access_token: tokenData.access_token,
        id_token: tokenData.id_token,
        refresh_token: tokenData.refresh_token ?? existingAccount.refresh_token,
        expires_at: tokenData.expires_in
          ? Math.floor(Date.now() / 1000) + tokenData.expires_in
          : null,
      },
    })
    return existingAccount.user
  }

  // 2. Usuário com mesmo e-mail já existe? → vincula conta OAuth
  const existingUser = await prisma.user.findUnique({
    where: { email: userInfo.email },
  })

  if (existingUser) {
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        type: 'oauth',
        provider,
        providerAccountId: userInfo.id,
        access_token: tokenData.access_token,
        id_token: tokenData.id_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in
          ? Math.floor(Date.now() / 1000) + tokenData.expires_in
          : null,
        token_type: 'bearer',
      },
    })
    return existingUser
  }

  // 3. Novo usuário → cria User + Tenant + Account
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const slug = await uniqueSlug(generateSlug(userInfo.email))

  const newUser = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        nome: userInfo.name || userInfo.email.split('@')[0],
        slug,
        plano: 'free',
        trialEndsAt,
      },
    })

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: userInfo.name,
        email: userInfo.email,
        image: userInfo.image,
        emailVerified: new Date(),
        trialEndsAt,
      },
    })

    await tx.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider,
        providerAccountId: userInfo.id,
        access_token: tokenData.access_token,
        id_token: tokenData.id_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in
          ? Math.floor(Date.now() / 1000) + tokenData.expires_in
          : null,
        token_type: 'bearer',
      },
    })

    return user
  })

  // Boas-vindas (não bloqueia)
  sendWelcomeEmail(newUser.email, newUser.name || '').catch(() => {})

  return newUser
}

// ─── Lógica principal do callback ─────────────────────────────────────────────

async function handleCallback(
  provider: OAuthProvider,
  code: string,
  state: string,
  appleUserField?: string | null
): Promise<NextResponse> {
  // Valida state CSRF (Apple usa form_post: cookie deve chegar, mas é mais tolerante)
  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value

  if (provider !== 'apple' && savedState !== state) {
    console.warn(`OAuth state mismatch (${provider}): got=${state}, expected=${savedState}`)
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  // Limpa state cookie
  cookieStore.delete('oauth_state')

  try {
    let userInfo: OAuthUserInfo
    let tokenData: TokenData

    if (provider === 'google') {
      tokenData = await googleExchangeCode(code)
      userInfo = await googleGetUser(tokenData.access_token)
    } else if (provider === 'microsoft') {
      tokenData = await microsoftExchangeCode(code)
      userInfo = await microsoftGetUser(tokenData.access_token)
    } else {
      // apple
      tokenData = await appleExchangeCode(code)
      const { sub, email } = appleDecodeIdToken(tokenData.id_token!)

      // Nome só vem na primeira autenticação, no campo `user` do form POST
      let name: string | null = null
      if (appleUserField) {
        try {
          const parsed = JSON.parse(appleUserField)
          name =
            [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(' ') || null
        } catch {}
      }

      userInfo = { id: sub, email: email || '', name, image: null }
    }

    if (!userInfo.email) {
      return NextResponse.redirect(`${APP_URL}/login?error=no_email`)
    }

    const user = await findOrCreateOAuthUser(provider, userInfo, tokenData)

    if (!user.tenantId) {
      return NextResponse.redirect(`${APP_URL}/login?error=no_tenant`)
    }

    const token = await signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name ?? null,
    })

    const response = NextResponse.redirect(`${APP_URL}/dashboard`)
    const cookie = createSessionCookie(token)
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      path: cookie.path,
    })

    return response
  } catch (err) {
    console.error(`OAuth callback error (${provider}):`, err)
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_failed`)
  }
}

// ─── GET — Google e Microsoft ─────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(req.url)

  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`)
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state') || ''

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`)
  }

  if (!['google', 'microsoft'].includes(provider)) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_provider`)
  }

  return handleCallback(provider as OAuthProvider, code, state)
}

// ─── POST — Apple (response_mode=form_post) ───────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  if (provider !== 'apple') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const formData = await req.formData()
  const error = formData.get('error') as string | null
  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`)
  }

  const code = formData.get('code') as string | null
  const state = (formData.get('state') as string) || ''
  const appleUser = formData.get('user') as string | null

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`)
  }

  return handleCallback('apple', code, state, appleUser)
}
