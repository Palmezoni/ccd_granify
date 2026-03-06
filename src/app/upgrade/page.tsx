'use client'

// src/app/upgrade/page.tsx
// Standalone upgrade wall — shown when trial expires or account is suspended.
// Placed OUTSIDE (app) group so it has no layout interference and
// plain <a> tags navigate without any React hydration conflicts.

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { TrendingUp } from 'lucide-react'

function UpgradeContent() {
  const params = useSearchParams()
  const isSuspended = params.get('suspended') === '1'

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-black text-emerald-700">Granify</span>
      </div>

      {/* Headline */}
      <div className="mb-8 text-center">
        {isSuspended ? (
          <>
            <h1 className="text-3xl font-black text-slate-900">Conta suspensa</h1>
            <p className="mt-3 text-slate-600">
              Sua assinatura está suspensa. Renove para continuar usando o Granify.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black text-slate-900">Seu período gratuito expirou</h1>
            <p className="mt-3 text-slate-600">
              Escolha um plano para continuar usando o Granify
            </p>
          </>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {/* Mensal */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Mensal</div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-black text-slate-900">R$ 29,90</span>
              <span className="mb-1 text-sm text-slate-500">/mês</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">cobrado mensalmente</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">
            <li>✓ Contas ilimitadas</li>
            <li>✓ Cartões e faturas</li>
            <li>✓ Metas e relatórios</li>
          </ul>
          <a
            href="/assinar/monthly"
            className="block rounded-xl border border-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            Assinar agora
          </a>
        </div>

        {/* Semestral — mais popular */}
        <div className="relative flex flex-col rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-xl shadow-emerald-100">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white">
              Mais popular
            </span>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Semestral</div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">-20%</span>
            </div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-black text-slate-900">R$ 23,92</span>
              <span className="mb-1 text-sm text-slate-500">/mês</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">R$ 143,52 a cada 6 meses</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">
            <li>✓ Contas ilimitadas</li>
            <li>✓ Cartões e faturas</li>
            <li>✓ Metas e relatórios</li>
          </ul>
          <a
            href="/assinar/semiannual"
            className="block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors"
          >
            Assinar agora
          </a>
        </div>

        {/* Anual */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Anual</div>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">-30%</span>
            </div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-black text-slate-900">R$ 20,93</span>
              <span className="mb-1 text-sm text-slate-500">/mês</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">R$ 251,16 cobrado anualmente</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">
            <li>✓ Contas ilimitadas</li>
            <li>✓ Cartões e faturas</li>
            <li>✓ Metas e relatórios</li>
          </ul>
          <a
            href="/assinar/annual"
            className="block rounded-xl border border-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-violet-600 hover:bg-violet-50 transition-colors"
          >
            Assinar agora
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-slate-400">
        <a href="/api/auth/logout" className="underline hover:text-slate-600">
          Sair da conta
        </a>
      </p>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <UpgradeContent />
    </Suspense>
  )
}
