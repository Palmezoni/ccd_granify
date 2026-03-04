import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, Clock, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getDashboardData(userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [contas, lancamentosContas, receitasMes, despesasMes, ultimosLancamentos] = await Promise.all([
    prisma.conta.findMany({
      where: { userId, ativa: true },
      select: { id: true, nome: true, saldoInicial: true, cor: true, tipo: true, incluirTotal: true },
      orderBy: { ordem: 'asc' },
    }),
    // Get all confirmed transactions per account to calculate real balances
    prisma.lancamento.findMany({
      where: {
        userId,
        status: 'CONFIRMADO',
        OR: [
          { contaId: { not: null } },
          { contaDestinoId: { not: null } },
        ],
      },
      select: { tipo: true, valor: true, contaId: true, contaDestinoId: true },
    }),
    prisma.lancamento.aggregate({
      where: {
        userId, tipo: 'RECEITA', status: 'CONFIRMADO',
        data: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { valor: true },
    }),
    prisma.lancamento.aggregate({
      where: {
        userId, tipo: 'DESPESA', status: 'CONFIRMADO',
        data: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { valor: true },
    }),
    prisma.lancamento.findMany({
      where: { userId },
      orderBy: { data: 'desc' },
      take: 8,
      select: {
        id: true, descricao: true, valor: true, tipo: true, data: true, status: true,
        categoria: { select: { nome: true, cor: true } },
        conta: { select: { nome: true } },
      },
    }),
  ])

  // Calculate real balance per account
  const contasComSaldo = contas.map((conta) => {
    let saldo = Number(conta.saldoInicial)
    for (const l of lancamentosContas) {
      if (l.tipo === 'RECEITA' && l.contaId === conta.id) saldo += Number(l.valor)
      if (l.tipo === 'DESPESA' && l.contaId === conta.id) saldo -= Number(l.valor)
      if (l.tipo === 'TRANSFERENCIA' && l.contaId === conta.id) saldo -= Number(l.valor)
      if (l.tipo === 'TRANSFERENCIA' && l.contaDestinoId === conta.id) saldo += Number(l.valor)
    }
    return { ...conta, saldo }
  })

  return { contas: contasComSaldo, receitasMes, despesasMes, ultimosLancamentos }
}

export default async function DashboardPage() {
  const session = await getSession()
  const { contas, receitasMes, despesasMes, ultimosLancamentos } = await getDashboardData(session!.userId)

  const totalReceitas = Number(receitasMes._sum.valor ?? 0)
  const totalDespesas = Number(despesasMes._sum.valor ?? 0)
  const resultado = totalReceitas - totalDespesas
  const saldoTotal = contas.filter((c) => c.incluirTotal).reduce((s, c) => s + c.saldo, 0)

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground capitalize">{monthName}</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo Total"
          value={formatCurrency(saldoTotal)}
          icon={<Wallet className="h-5 w-5" />}
          color="emerald"
          subtitle={`${contas.filter((c) => c.incluirTotal).length} conta${contas.filter((c) => c.incluirTotal).length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          title="Receitas do Mês"
          value={formatCurrency(totalReceitas)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
          subtitle="confirmadas"
        />
        <MetricCard
          title="Despesas do Mês"
          value={formatCurrency(totalDespesas)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="red"
          subtitle="confirmadas"
        />
        <MetricCard
          title="Resultado do Mês"
          value={formatCurrency(resultado)}
          icon={<DollarSign className="h-5 w-5" />}
          color={resultado >= 0 ? 'emerald' : 'red'}
          subtitle={resultado >= 0 ? 'positivo' : 'negativo'}
        />
      </div>

      {/* Contas + Últimos lançamentos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contas */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Contas</h2>
            <Link href="/cadastros/contas" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
              Gerenciar
            </Link>
          </div>
          {contas.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              message="Nenhuma conta cadastrada"
              action={{ label: 'Adicionar conta', href: '/cadastros/contas' }}
            />
          ) : (
            <div className="space-y-2">
              {contas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conta.cor || '#10b981' }} />
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{conta.nome}</span>
                      {!conta.incluirTotal && (
                        <span className="ml-1.5 text-xs text-slate-400">(excluída do total)</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${conta.saldo >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(conta.saldo)}
                  </span>
                </div>
              ))}
              {contas.length > 1 && (
                <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium text-slate-500">Total geral</span>
                  <span className={`text-sm font-bold ${saldoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(saldoTotal)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Últimos lançamentos */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Últimos Lançamentos</h2>
            <Link href="/movimentacoes/lancamentos" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
              Ver todos
            </Link>
          </div>
          {ultimosLancamentos.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              message="Nenhum lançamento ainda"
              action={{ label: 'Adicionar lançamento', href: '/movimentacoes/lancamentos' }}
            />
          ) : (
            <div className="space-y-1.5">
              {ultimosLancamentos.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                  {/* Type indicator */}
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                    ${l.tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                      l.tipo === 'DESPESA' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}`}>
                    {l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '-' : '↔'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{l.descricao}</p>
                    <p className="text-xs text-slate-400">
                      {l.categoria?.nome ?? (l.tipo === 'TRANSFERENCIA' ? 'Transferência' : '—')} · {new Date(l.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600 dark:text-emerald-400' : l.tipo === 'DESPESA' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      {l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '-' : ''}{formatCurrency(Number(l.valor))}
                    </span>
                    {l.status === 'PROJETADO' && (
                      <p className="text-xs text-amber-500">Previsto</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup prompt if no accounts */}
      {contas.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-sm shadow-emerald-500/30">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Configure suas finanças</h3>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                Comece adicionando suas contas bancárias e categorias para ter controle completo.
              </p>
              <div className="mt-3 flex gap-3">
                <Link
                  href="/cadastros/contas"
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Adicionar conta
                </Link>
                <Link
                  href="/cadastros/categorias"
                  className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300"
                >
                  Configurar categorias
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, icon, color, subtitle }: {
  title: string; value: string; icon: React.ReactNode
  color: 'emerald' | 'blue' | 'red'; subtitle: string
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon, message, action }: {
  icon: React.ReactNode; message: string; action: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="text-sm text-slate-500">{message}</p>
      <Link href={action.href} className="mt-2 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
        {action.label}
      </Link>
    </div>
  )
}
