import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
import { ShortcutsProvider } from '@/components/providers/shortcuts-provider'

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

  // Trial expired → redirect to standalone upgrade page (avoids layout hydration issues)
  if (
    tenant?.planStatus === 'TRIAL' &&
    tenant.trialEndsAt &&
    tenant.trialEndsAt < now
  ) {
    redirect('/upgrade')
  }

  // Suspended → also redirect to upgrade page
  if (tenant?.planStatus === 'SUSPENDED') {
    redirect('/upgrade?suspended=1')
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
