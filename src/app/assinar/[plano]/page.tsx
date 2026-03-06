'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const VALID_PLANS = ['monthly', 'semiannual', 'annual'] as const
type Plan = typeof VALID_PLANS[number]

const PLAN_LABELS: Record<Plan, string> = {
  monthly: 'Mensal — R$ 29,90/mês',
  semiannual: 'Semestral — R$ 23,92/mês (R$ 143,52 a cada 6 meses)',
  annual: 'Anual — R$ 20,93/mês (R$ 251,16/ano)',
}

const MAX_AUTO_RETRIES = 2
const RETRY_DELAY_MS = 1000

export default function AssinarPage() {
  const { plano } = useParams<{ plano: string }>()
  const router = useRouter()
  const [error, setError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  // Incrementing this triggers a fresh checkout attempt from useEffect
  const [runId, setRunId] = useState(0)

  const runCheckout = useCallback(async (signal: AbortSignal) => {
    if (!VALID_PLANS.includes(plano as Plan)) {
      router.replace('/')
      return
    }

    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
      if (signal.aborted) return

      if (attempt > 0) {
        setRetryCount(attempt)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        if (signal.aborted) return
      }

      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plano }),
          signal,
        })

        if (signal.aborted) return

        if (res.status === 401) {
          setNeedsLogin(true)
          return
        }

        let data: { url?: string; error?: string }
        try {
          data = await res.json()
        } catch {
          // Response was not JSON — treat as network error and retry
          if (attempt === MAX_AUTO_RETRIES) {
            setError('Erro inesperado. Tente novamente.')
          }
          continue
        }

        if (signal.aborted) return

        if (data.url) {
          window.location.href = data.url
          return
        }

        // API returned JSON error
        if (attempt === MAX_AUTO_RETRIES) {
          setError(data.error || 'Erro ao criar sessão de pagamento')
        }
        // else: continue to next retry iteration

      } catch (err) {
        if (signal.aborted) return
        if (attempt === MAX_AUTO_RETRIES) {
          setError(
            err instanceof Error && err.name !== 'AbortError'
              ? 'Erro de conexão. Verifique sua internet e tente novamente.'
              : 'Erro ao criar sessão de pagamento'
          )
        }
      }
    }
  }, [plano, router])

  useEffect(() => {
    setError('')
    setRetryCount(0)
    const controller = new AbortController()
    runCheckout(controller.signal)
    return () => controller.abort()
  }, [runCheckout, runId])

  const handleManualRetry = () => {
    setError('')
    setRetryCount(0)
    setRunId((n) => n + 1)
  }

  if (needsLogin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
          <TrendingUp className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faça login para continuar</h1>
          <p className="mt-2 text-sm text-slate-500">Você precisa estar logado para assinar um plano.</p>
        </div>
        <Link
          href={`/login?redirect=/assinar/${plano}`}
          className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
        >
          Entrar na conta
        </Link>
        <Link href="/cadastro" className="text-sm text-slate-500 underline hover:text-slate-700">
          Criar conta grátis (7 dias grátis)
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <TrendingUp className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Algo deu errado</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        <button
          onClick={handleManualRetry}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Tentar novamente
        </button>
        <Link href="/dashboard" className="text-sm text-slate-500 underline">Voltar ao Dashboard</Link>
      </div>
    )
  }

  // Loading state — shown while fetching/retrying
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
        <TrendingUp className="h-7 w-7 text-white" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Redirecionando para o pagamento...</h1>
        {plano && VALID_PLANS.includes(plano as Plan) && (
          <p className="mt-2 text-sm text-slate-500">{PLAN_LABELS[plano as Plan]}</p>
        )}
        {retryCount > 0 && (
          <p className="mt-1 text-xs text-amber-600">Tentativa {retryCount + 1}...</p>
        )}
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-xs text-slate-400">Você será redirecionado para o Stripe de forma segura.</p>
    </div>
  )
}
