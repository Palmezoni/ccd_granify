// src/middleware.ts — Granify
// Protege rotas de página autenticadas e redireciona usuários já logados
// Nota: rotas /api/* têm sua própria autenticação em cada route handler — não bloqueadas aqui
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'granify-dev-secret-change-in-production'
)

const COOKIE_NAME = 'granify_session'

// Prefixos de página que exigem sessão válida
const PROTECTED_PAGE_PREFIXES = [
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

// Páginas públicas que devem redirecionar quem já está logado
const AUTH_PAGES = ['/login', '/cadastro']

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

  // Rotas /api/* — nunca bloqueadas pelo middleware (cada handler verifica auth própria)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value
  const isAuthenticated = token ? await verifyToken(token) : false

  // ── Páginas protegidas: redireciona para /login se não autenticado ──────────
  if (PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url)
      if (pathname !== '/dashboard') {
        loginUrl.searchParams.set('redirect', pathname)
      }
      const res = NextResponse.redirect(loginUrl)
      if (token) res.cookies.delete(COOKIE_NAME) // limpa cookie inválido
      return res
    }
    return NextResponse.next()
  }

  // ── Páginas de auth: redireciona para /dashboard se já logado ───────────────
  if (AUTH_PAGES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Ignora assets estáticos, imagens e fontes
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
