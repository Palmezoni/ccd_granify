'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, TrendingUp } from 'lucide-react'

const VALID_PLANS = ['monthly', 'semiannual', 'annual'] as const
type Plan = typeof VALID_PLANS[number]

const PLAN_LABELS: Record<Plan, string> = {
  monthly: 'Mensal - R$ 29,90/mês',
  semiannual: 'Semestral - R$ 23,92/mês (R$ 143,52 a cada 6 meses)',
  annual: 'Anual - R$ 20,93/mês (R$ 251,16/ano)',
}

export default function AssinarPage() {
  const { plano } = useParams<{ plano: string }>()
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!VALID_PLANS.includes(plano as Plan)) {
      router.replace('/dashboard')
      return
    }

    async function startCheckout() {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plano }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          setError(data.error || 'Erro ao criar sessão de pagamento')
        }
      } catch {
        setError('Erro de conexão. Tente novamente.')
      }
    }

    startCheckout()
  }, [plano, router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-red-500 text-lg font-semibold">{error}</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Voltar ao Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200">
        <TrendingUp className="h-8 w-8 text-white" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Redirecionando para o pagamento...</h1>
        {plano && VALID_PLANS.includes(plano as Plan) && (
          <p className="mt-2 text-sm text-slate-500">{PLAN_LABELS[plano as Plan]}</p>
        )}
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-xs text-slate-400">Você será redirecionado para o Stripe de forma segura.</p>
    </div>
  )
}
