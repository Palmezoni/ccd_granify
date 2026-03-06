import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
import { ShortcutsProvider } from '@/components/providers/shortcuts-provider'
import { TrendingUp } from 'lucide-react'

// ─── Upgrade Wall — shown when trial expires ──────────────────────────────────

function UpgradeWall({ userName }: { userName: string | null }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-black text-emerald-700">Granify</span>
      </div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-slate-900">Seu período gratuito expirou</h1>
        <p className="mt-3 text-slate-600">
          {userName ? `Olá, ${userName.split(' ')[0]}! Escolha` : 'Escolha'} um plano para continuar usando o Granify
        </p>
      </div>
      {/* 3 plan cards */}
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
          <a href="/assinar/monthly" className="mt-auto block rounded-xl border border-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-emerald-600 hover:bg-emerald-50">
            Assinar agora
          </a>
        </div>
        {/* Semestral */}
        <div className="relative flex flex-col rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-xl shadow-emerald-100">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white">Mais popular</span>
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
          <a href="/assinar/semiannual" className="mt-auto block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700">
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
          <a href="/assinar/annual" className="mt-auto block rounded-xl border border-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-violet-600 hover:bg-violet-50">
            Assinar agora
          </a>
        </div>
      </div>
      <p className="mt-8 text-sm text-slate-400">
        <a href="/api/auth/logout" className="underline hover:text-slate-600">Sair da conta</a>
      </p>
    </div>
  )
}

// ─── Suspended notice ─────────────────────────────────────────────────────────

function SuspendedNotice({ userName }: { userName: string | null }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-200">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-black text-red-700">Granify</span>
      </div>
      <div className="mb-8 text-center max-w-lg">
        <h1 className="text-3xl font-black text-slate-900">Conta suspensa</h1>
        <p className="mt-3 text-slate-600">
          {userName ? `Olá, ${userName.split(' ')[0]}. A` : 'A'} sua conta está temporariamente suspensa. Renove sua assinatura para continuar usando o Granify.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <a href="/assinar/monthly" className="rounded-xl border border-red-600 px-6 py-3 text-center text-sm font-semibold text-red-600 hover:bg-red-50">
          Renovar assinatura
        </a>
        <a href="/api/auth/logout" className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Sair da conta
        </a>
      </div>
    </div>
  )
}

// ─── Trial Banner — slim bar shown when trial is active but expiring soon ─────

function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="w-full bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white">
      &#x23F1; Trial: {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'} &middot;{' '}
      <a href="/assinar/semiannual" className="underline hover:text-amber-100">
        Assinar agora
      </a>
    </div>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  })

  if (!user) redirect('/login')

  const isAdmin = user.role === 'ADMIN'

  // Fetch tenant plan status
  const tenant = session.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { planStatus: true, trialEndsAt: true },
      })
    : null

  const now = new Date()

  // Trial expired → show upgrade wall
  if (
    tenant?.planStatus === 'TRIAL' &&
    tenant.trialEndsAt &&
    tenant.trialEndsAt < now
  ) {
    return <UpgradeWall userName={user.name} />
  }

  // Suspended → show suspended notice
  if (tenant?.planStatus === 'SUSPENDED') {
    return <SuspendedNotice userName={user.name} />
  }

  // Calculate trial days remaining (show banner if ≤ 3 days left and still in trial)
  let trialDaysLeft: number | null = null
  if (
    tenant?.planStatus === 'TRIAL' &&
    tenant.trialEndsAt &&
    tenant.trialEndsAt >= now
  ) {
    const msLeft = tenant.trialEndsAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    if (daysLeft <= 3) {
      trialDaysLeft = daysLeft
    }
  }

  return (
    <SidebarProvider>
      <ShortcutsProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          {trialDaysLeft !== null && <TrialBanner daysLeft={trialDaysLeft} />}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar isAdmin={isAdmin} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar user={{ ...user, role: user.role }} />
              <main className="flex-1 overflow-y-auto p-4 lg:p-7">
                {children}
              </main>
            </div>
          </div>
        </div>
      </ShortcutsProvider>
    </SidebarProvider>
  )
}
