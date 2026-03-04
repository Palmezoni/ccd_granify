import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/forgot-password', '/reset-password']
const API_PUBLIC = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/google']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  // Rotas públicas
  if (PUBLIC_PATHS.includes(pathname)) {
    const session = await getSessionFromRequest(req)
    // Se já está logado, redirecionar para o app
    if (session && (pathname === '/login' || pathname === '/cadastro' || pathname === '/' || pathname === '/forgot-password' || pathname.startsWith('/reset-password'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Rotas protegidas do app
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
