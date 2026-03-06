// src/middleware.ts — Granify
// Protege rotas autenticadas e redireciona usuários já logados para o dashboard
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'granify-dev-secret-change-in-production'
)

const COOKIE_NAME = 'granify_session'

// Rotas de página que exigem autenticação
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/movimentacoes',
  '/extrato',
  '/cartoes',
  '/metas',
  '/relatorios',
  '/cadastros',
  '/configuracoes',
  '/fluxo-de-caixa',
  '/admin',
]

// Rotas de API que exigem autenticação (qualquer /api/* que não seja pública)
const PUBLIC_API_PREFIXES = [
  '/api/auth/',        // login, register, forgot, reset, oauth, callback
  '/api/webhooks/',    // Cakto webhook (tem própria auth por secret)
]

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET)
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE_NAME)?.value

  // ── Rotas de página protegidas ─────────────────────────────────────────────
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!token || !(await verifyToken(token))) {
      const loginUrl = new URL('/login', req.url)
      // Preserva destino para redirecionar após login (opcional)
      if (pathname !== '/dashboard') {
        loginUrl.searchParams.set('redirect', pathname)
      }
      const res = NextResponse.redirect(loginUrl)
      // Limpa cookie inválido se existir
      if (token) res.cookies.delete(COOKIE_NAME)
      return res
    }
    return NextResponse.next()
  }

  // ── Rotas de API protegidas ────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
    if (!isPublic) {
      if (!token || !(await verifyToken(token))) {
        return NextResponse.json(
          { error: 'Não autorizado. Faça login para continuar.' },
          { status: 401 }
        )
      }
    }
    return NextResponse.next()
  }

  // ── Redireciona usuário já logado que tenta acessar /login ou /cadastro ────
  if (pathname === '/login' || pathname === '/cadastro') {
    if (token && (await verifyToken(token))) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - arquivos de imagem/fonte
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
