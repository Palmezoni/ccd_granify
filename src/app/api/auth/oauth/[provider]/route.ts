// src/app/api/auth/oauth/[provider]/route.ts
// Inicia o fluxo OAuth: gera state CSRF, seta cookie e redireciona ao provider
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { OAuthProvider, googleAuthUrl, microsoftAuthUrl, appleAuthUrl } from '@/lib/oauth'

const VALID_PROVIDERS: OAuthProvider[] = ['google', 'microsoft', 'apple']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
  }

  // Gera state aleatório para proteção CSRF
  const state = crypto.randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutos
    path: '/',
  })

  let authUrl: string
  switch (provider as OAuthProvider) {
    case 'google':
      authUrl = googleAuthUrl(state)
      break
    case 'microsoft':
      authUrl = microsoftAuthUrl(state)
      break
    case 'apple':
      authUrl = appleAuthUrl(state)
      break
    default:
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
  }

  return NextResponse.redirect(authUrl)
}
