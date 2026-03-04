'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar e-mail')
      } else {
        setSent(true)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-emerald-700">Granify</span>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
            <CheckCircle className="mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-xl font-bold text-slate-900">E-mail enviado!</h1>
            <p className="text-sm text-slate-500">
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
            </p>
            <Link href="/login" className="mt-6 flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
            <h1 className="mb-1 text-2xl font-bold text-slate-900">Esqueceu a senha?</h1>
            <p className="mb-6 text-sm text-slate-500">Informe seu e-mail e enviaremos as instruções para redefinir sua senha.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar instruções
              </button>
            </form>

            <Link href="/login" className="mt-5 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-emerald-600">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
