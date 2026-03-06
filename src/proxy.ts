import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/forgot-password', '/reset-password']
const PUBLIC_PREFIXES = ['/assinar/', '/upgrade']
const API_PUBLIC = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/oauth/',      // inicia fluxo OAuth (google, microsoft, apple)
  '/api/auth/callback/',   // callback OAuth após autenticação no provider
  '/api/health',
  '/api/webhooks/stripe',  // webhook Stripe — não usa nossa autenticação
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Helper — NextResponse.next() com x-pathname injetado nos headers
  // Permite que Server Components (ex: AppLayout) leiam o pathname atual
  function nextWithPathname(): NextResponse {
    const res = NextResponse.next()
    res.headers.set('x-pathname', pathname)
    return res
  }

  // Rotas de API públicas — sem verificação
  if (API_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rotas de API protegidas
  if (pathname.startsWith('/api/')) {
    // Verificar Bearer token (acesso externo via ApiToken)
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      // Validação de ApiToken é feita em cada rota individualmente
      return NextResponse.next()
    }

    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Rotas públicas (prefix-based) — /assinar/* é acessível sem login
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return nextWithPathname()
  }

  // Rotas públicas
  if (PUBLIC_PATHS.includes(pathname)) {
    const session = await getSessionFromRequest(req)
    // Se já está logado, redirecionar para o app
    if (session && (pathname === '/login' || pathname === '/cadastro' || pathname === '/' || pathname === '/forgot-password' || pathname.startsWith('/reset-password'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return nextWithPathname()
  }

  // Rotas protegidas do app
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return nextWithPathname()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
