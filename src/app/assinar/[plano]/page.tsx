'use client'

import { useEffect, useState } from 'react'
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

export default function AssinarPage() {
  const { plano } = useParams<{ plano: string }>()
  const router = useRouter()
  const [error, setError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    if (!VALID_PLANS.includes(plano as Plan)) {
      router.replace('/')
      return
    }

    async function startCheckout() {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plano }),
        })

        if (res.status === 401) {
          setNeedsLogin(true)
          return
        }

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
        <div className="text-red-500 text-lg font-semibold">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Tentar novamente
        </button>
        <Link href="/dashboard" className="text-sm text-slate-500 underline">Voltar ao Dashboard</Link>
      </div>
    )
  }

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
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-xs text-slate-400">Você será redirecionado para o Stripe de forma segura.</p>
    </div>
  )
}
