// src/lib/oauth.ts — Granify OAuth helpers
// Suporte: Google, Microsoft (Azure AD), Apple Sign In
import { SignJWT, importPKCS8 } from 'jose'

export type OAuthProvider = 'google' | 'microsoft' | 'apple'

export interface OAuthUserInfo {
  id: string
  email: string
  name: string | null
  image: string | null
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
}

export function getCallbackUrl(provider: OAuthProvider): string {
  return `${getAppUrl()}/api/auth/callback/${provider}`
}

// ── GOOGLE ────────────────────────────────────────────────────────────────────

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getCallbackUrl('google'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function googleExchangeCode(
  code: string
): Promise<{ access_token: string; id_token?: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getCallbackUrl('google'),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token exchange failed: ${err}`)
  }
  return res.json()
}

export async function googleGetUser(access_token: string): Promise<OAuthUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!res.ok) throw new Error('Failed to get Google user info')
  const data = await res.json()
  return {
    id: data.sub,
    email: data.email,
    name: data.name || null,
    image: data.picture || null,
  }
}

// ── MICROSOFT ─────────────────────────────────────────────────────────────────

export function microsoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: getCallbackUrl('microsoft'),
    response_type: 'code',
    scope: 'openid email profile User.Read',
    state,
    prompt: 'select_account',
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

export async function microsoftExchangeCode(
  code: string
): Promise<{ access_token: string; id_token?: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: getCallbackUrl('microsoft'),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Microsoft token exchange failed: ${err}`)
  }
  return res.json()
}

export async function microsoftGetUser(access_token: string): Promise<OAuthUserInfo> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!res.ok) throw new Error('Failed to get Microsoft user info')
  const data = await res.json()
  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    name: data.displayName || null,
    image: null, // photo requer permissão extra no Graph API
  }
}

// ── APPLE ─────────────────────────────────────────────────────────────────────

/**
 * Gera o client_secret da Apple: JWT ES256 assinado com a chave privada (.p8)
 * Válido por ~6 meses (máximo permitido pela Apple)
 */
async function appleClientSecret(): Promise<string> {
  const rawKey = process.env.APPLE_PRIVATE_KEY || ''
  // Suporta chave com \n escapado (como em variáveis de ambiente)
  const privateKeyStr = rawKey.replace(/\\n/g, '\n')
  const key = await importPKCS8(privateKeyStr, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({
    iss: process.env.APPLE_TEAM_ID!,
    iat: now,
    exp: now + 15_777_000, // ~6 meses
    aud: 'https://appleid.apple.com',
    sub: process.env.APPLE_CLIENT_ID!,
  })
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .sign(key)
}

export function appleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID!,
    redirect_uri: getCallbackUrl('apple'),
    response_type: 'code',
    scope: 'name email',
    state,
    response_mode: 'form_post', // Apple exige form_post
  })
  return `https://appleid.apple.com/auth/authorize?${params}`
}

export async function appleExchangeCode(
  code: string
): Promise<{ access_token: string; id_token: string; refresh_token?: string; expires_in?: number }> {
  const clientSecret = await appleClientSecret()
  const res = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: getCallbackUrl('apple'),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apple token exchange failed: ${err}`)
  }
  return res.json()
}

/**
 * Decodifica o id_token da Apple (sem verificar assinatura — sub é suficiente para auth)
 */
export function appleDecodeIdToken(id_token: string): { sub: string; email: string | null } {
  try {
    const [, payloadB64] = id_token.split('.')
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    return { sub: decoded.sub, email: decoded.email || null }
  } catch {
    throw new Error('Failed to decode Apple ID token')
  }
}
