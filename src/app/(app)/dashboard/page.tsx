'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Clock,
  GripVertical,
  Settings2,
  ChevronDown,
  Check,
  X,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetId = 'kpis' | 'evolucao' | 'contas' | 'ultimos' | 'categorias'

interface WidgetConfig {
  id: WidgetId
  label: string
  visible: boolean
}

interface ContaData {
  id: string
  nome: string
  cor: string | null
  tipo: string
  saldo: number
  incluirTotal: boolean
}

interface LancamentoData {
  id: string
  descricao: string
  valor: number
  tipo: string
  data: string
  status: string
  categoria: { nome: string; cor: string } | null
  conta: { nome: string } | null
}

interface CategoriaData {
  nome: string
  cor: string | null
  total: number
}

interface EvolucaoItem {
  mes: string
  receitas: number
  despesas: number
}

interface DashboardData {
  kpis: { saldoTotal: number; receitasMes: number; despesasMes: number; resultado: number }
  contas: ContaData[]
  ultimos8: LancamentoData[]
  despesasPorCategoria: CategoriaData[]
  evolucao: EvolucaoItem[]
}

// ─── Default widget config ────────────────────────────────────────────────────

const WIDGET_DEFAULTS: WidgetConfig[] = [
  { id: 'kpis', label: 'Indicadores (KPIs)', visible: true },
  { id: 'evolucao', label: 'Evolução Mensal', visible: true },
  { id: 'contas', label: 'Contas', visible: true },
  { id: 'ultimos', label: 'Últimos Lançamentos', visible: true },
  { id: 'categorias', label: 'Despesas por Categoria', visible: true },
]

function loadWidgets(): WidgetConfig[] {
  try {
    const saved = localStorage.getItem('dashboard-widgets-v2')
    if (saved) {
      const parsed: WidgetConfig[] = JSON.parse(saved)
      // Merge with defaults so new widgets appear
      const merged = WIDGET_DEFAULTS.map((def) => {
        const existing = parsed.find((p) => p.id === def.id)
        return existing ? { ...def, visible: existing.visible } : def
      })
      // Preserve saved order
      return parsed
        .map((p) => merged.find((m) => m.id === p.id))
        .filter(Boolean)
        .concat(merged.filter((m) => !parsed.find((p) => p.id === m.id))) as WidgetConfig[]
    }
  } catch {}
  return WIDGET_DEFAULTS
}

// ─── Helper: default period (current month) ───────────────────────────────────

function defaultPeriod() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    inicio: `${y}-${m}-01`,
    fim: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

// ─── Sortable widget wrapper ──────────────────────────────────────────────────

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded p-1 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-muted-foreground active:cursor-grabbing"
        title="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {children}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const period = defaultPeriod()

  const [inicio, setInicio] = useState(period.inicio)
  const [fim, setFim] = useState(period.fim)

  const [allContasOpcoes, setAllContasOpcoes] = useState<ContaData[]>([])
  const [contasSelecionadas, setContasSelecionadas] = useState<string[]>([])
  const [showContasDropdown, setShowContasDropdown] = useState(false)

  const [widgets, setWidgets] = useState<WidgetConfig[]>(WIDGET_DEFAULTS)
  const [showPersonalizar, setShowPersonalizar] = useState(false)
  const [tempWidgets, setTempWidgets] = useState<WidgetConfig[]>(WIDGET_DEFAULTS)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const contasDropdownRef = useRef<HTMLDivElement>(null)
  // skipFilterRef: skip the 2 automatic triggers (mount + initial contas load)
  // so only user-initiated changes cause a re-fetch
  const skipFilterRef = useRef(2)

  // stateRef always holds current values → fetchData reads from it (no stale closure)
  const stateRef = useRef({ inicio, fim, contasSelecionadas, allContasOpcoes })
  stateRef.current = { inicio, fim, contasSelecionadas, allContasOpcoes }

  // Load widgets from localStorage on mount
  useEffect(() => {
    setWidgets(loadWidgets())
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        contasDropdownRef.current &&
        !contasDropdownRef.current.contains(e.target as Node)
      ) {
        setShowContasDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  // Stable callback — always reads latest values via stateRef (never stale)
  const fetchData = useCallback(async (silent = false) => {
    const { inicio: i, fim: f, contasSelecionadas: cs, allContasOpcoes: ao } = stateRef.current
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const params = new URLSearchParams({ inicio: i, fim: f })
      if (cs.length > 0 && ao.length > 0 && cs.length < ao.length) {
        params.set('contas', cs.join(','))
      }
      const res = await fetch(`/api/dashboard/stats?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // stable — never needs to change; reads latest via stateRef

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { inicio: i, fim: f } = defaultPeriod()
        const res = await fetch(`/api/dashboard/stats?inicio=${i}&fim=${f}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
          const contas: ContaData[] = json.contas ?? []
          setAllContasOpcoes(contas)
          setContasSelecionadas(contas.map((c) => c.id))
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Re-fetch on filter change — skip the 2 automatic triggers (mount + initial contas set)
  useEffect(() => {
    if (skipFilterRef.current > 0) {
      skipFilterRef.current -= 1
      return
    }
    fetchData()
  }, [inicio, fim, contasSelecionadas, fetchData])

  // ─── DnD ────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgets((prev) => {
        const oldIndex = prev.findIndex((w) => w.id === active.id)
        const newIndex = prev.findIndex((w) => w.id === over.id)
        const next = arrayMove(prev, oldIndex, newIndex)
        localStorage.setItem('dashboard-widgets-v2', JSON.stringify(next))
        return next
      })
    }
  }

  // ─── Personalizar modal ──────────────────────────────────────────────────────

  function openPersonalizar() {
    setTempWidgets([...widgets])
    setShowPersonalizar(true)
  }

  function savePersonalizar() {
    setWidgets(tempWidgets)
    localStorage.setItem('dashboard-widgets-v2', JSON.stringify(tempWidgets))
    setShowPersonalizar(false)
  }

  // ─── Account select helpers ──────────────────────────────────────────────────

  const allSelected =
    allContasOpcoes.length > 0 && contasSelecionadas.length === allContasOpcoes.length

  function toggleConta(id: string) {
    setContasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    if (allSelected) {
      // Keep at least one selected
      setContasSelecionadas(allContasOpcoes.length > 0 ? [allContasOpcoes[0].id] : [])
    } else {
      setContasSelecionadas(allContasOpcoes.map((c) => c.id))
    }
  }

  // ─── Render widgets ──────────────────────────────────────────────────────────

  function renderWidget(id: WidgetId) {
    if (!data) return null
    switch (id) {
      case 'kpis':
        return <KpisWidget data={data} />
      case 'evolucao':
        return <EvolucaoWidget data={data.evolucao} />
      case 'contas':
        return <ContasWidget contas={data.contas} />
      case 'ultimos':
        return <UltimosWidget lancamentos={data.ultimos8} />
      case 'categorias':
        return <CategoriasWidget categorias={data.despesasPorCategoria} />
      default:
        return null
    }
  }

  const visibleWidgets = widgets.filter((w) => w.visible)

  // ─── Derived label ───────────────────────────────────────────────────────────

  const contasLabel =
    allSelected
      ? 'Todas as contas'
      : contasSelecionadas.length === 0
        ? 'Nenhuma conta'
        : contasSelecionadas.length === 1
          ? allContasOpcoes.find((c) => c.id === contasSelecionadas[0])?.nome ?? '1 conta'
          : `${contasSelecionadas.length} contas`

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
          <span className="text-xs text-muted-foreground">De</span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="bg-transparent text-xs font-medium text-foreground outline-none"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="bg-transparent text-xs font-medium text-foreground outline-none"
          />
        </div>

        {/* Contas multi-select */}
        {allContasOpcoes.length > 0 && (
          <div className="relative" ref={contasDropdownRef}>
            <button
              onClick={() => setShowContasDropdown((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
            >
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{contasLabel}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showContasDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-xl">
                {/* Select all */}
                <button
                  onClick={toggleAll}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      allSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    }`}
                  >
                    {allSelected && <Check className="h-2.5 w-2.5" />}
                  </div>
                  Todas as contas
                </button>
                <div className="my-0.5 border-t border-border" />
                {allContasOpcoes.map((conta) => (
                  <button
                    key={conta.id}
                    onClick={() => toggleConta(conta.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        contasSelecionadas.includes(conta.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}
                    >
                      {contasSelecionadas.includes(conta.id) && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: conta.cor ?? '#10b981' }}
                    />
                    <span className="truncate">{conta.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:bg-accent disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* PERSONALIZAR */}
          <button
            onClick={openPersonalizar}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent"
          >
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            Personalizar
          </button>
        </div>
      </div>

      {/* ── Skeleton / Content ── */}
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={visibleWidgets.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-5">
              {visibleWidgets.map((w) => (
                <SortableWidget key={w.id} id={w.id}>
                  {renderWidget(w.id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Personalizar Modal ── */}
      {showPersonalizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Personalizar Dashboard</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ative ou desative widgets. Arraste para reordenar.
                </p>
              </div>
              <button
                onClick={() => setShowPersonalizar(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {tempWidgets.map((w, idx) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                  <span className="flex-1 text-sm text-foreground">{w.label}</span>
                  <button
                    onClick={() =>
                      setTempWidgets((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, visible: !x.visible } : x)),
                      )
                    }
                    className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                      w.visible ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        w.visible ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowPersonalizar(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-foreground transition hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={savePersonalizar}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Widget: KPIs ─────────────────────────────────────────────────────────────

function KpisWidget({ data }: { data: DashboardData }) {
  const { kpis } = data
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        title="Saldo Total"
        value={formatCurrency(kpis.saldoTotal)}
        icon={<Wallet className="h-4 w-4" />}
        color="emerald"
        subtitle={`${data.contas.filter((c) => c.incluirTotal).length} conta(s)`}
      />
      <KpiCard
        title="Receitas"
        value={formatCurrency(kpis.receitasMes)}
        icon={<TrendingUp className="h-4 w-4" />}
        color="blue"
        subtitle="confirmadas"
      />
      <KpiCard
        title="Despesas"
        value={formatCurrency(kpis.despesasMes)}
        icon={<TrendingDown className="h-4 w-4" />}
        color="red"
        subtitle="confirmadas"
      />
      <KpiCard
        title="Resultado"
        value={formatCurrency(kpis.resultado)}
        icon={<DollarSign className="h-4 w-4" />}
        color={kpis.resultado >= 0 ? 'emerald' : 'red'}
        subtitle={kpis.resultado >= 0 ? 'positivo' : 'negativo'}
      />
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'emerald' | 'blue' | 'red'
  subtitle: string
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 pl-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 truncate text-lg font-bold text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`flex-shrink-0 rounded-lg p-2 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

// ─── Widget: Evolução Mensal ──────────────────────────────────────────────────

function EvolucaoWidget({ data }: { data: EvolucaoItem[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
          <p className="mb-1.5 font-semibold text-foreground">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color }}>
              {entry.name === 'receitas' ? 'Receitas' : 'Despesas'}:{' '}
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 pl-6">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Evolução Mensal</h2>
        <span className="text-xs text-muted-foreground">(últimos 12 meses)</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
          <Legend
            formatter={(name) => (name === 'receitas' ? 'Receitas' : 'Despesas')}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="despesas" fill="#f43f5e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Widget: Contas ───────────────────────────────────────────────────────────

function ContasWidget({ contas }: { contas: ContaData[] }) {
  const saldoTotal = contas.filter((c) => c.incluirTotal).reduce((s, c) => s + c.saldo, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5 pl-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Contas</h2>
        </div>
        <Link
          href="/cadastros/contas"
          className="text-xs text-primary hover:underline"
        >
          Gerenciar
        </Link>
      </div>

      {contas.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Wallet className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma conta</p>
          <Link href="/cadastros/contas" className="mt-1 text-xs text-primary hover:underline">
            Adicionar conta
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {contas.map((conta) => (
            <div
              key={conta.id}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: conta.cor ?? '#10b981' }}
                />
                <span className="text-sm text-foreground">{conta.nome}</span>
                {!conta.incluirTotal && (
                  <span className="text-[10px] text-muted-foreground">(excl. total)</span>
                )}
              </div>
              <span
                className={`text-sm font-semibold ${
                  conta.saldo >= 0 ? 'text-foreground' : 'text-destructive'
                }`}
              >
                {formatCurrency(conta.saldo)}
              </span>
            </div>
          ))}
          {contas.length > 1 && (
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs text-muted-foreground">Total geral</span>
              <span
                className={`text-sm font-bold ${
                  saldoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                }`}
              >
                {formatCurrency(saldoTotal)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Widget: Últimos Lançamentos ──────────────────────────────────────────────

function UltimosWidget({ lancamentos }: { lancamentos: LancamentoData[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 pl-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Últimos Lançamentos</h2>
        </div>
        <Link
          href="/movimentacoes/lancamentos"
          className="text-xs text-primary hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {lancamentos.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum lançamento no período</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {lancamentos.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
            >
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${l.tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                    l.tipo === 'DESPESA' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}`}
              >
                {l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '−' : '↔'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{l.descricao}</p>
                <p className="text-[11px] text-muted-foreground">
                  {l.categoria?.nome ?? (l.tipo === 'TRANSFERENCIA' ? 'Transferência' : '—')} ·{' '}
                  {new Date(l.data).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-semibold ${
                    l.tipo === 'RECEITA'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : l.tipo === 'DESPESA'
                        ? 'text-destructive'
                        : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '−' : ''}
                  {formatCurrency(Number(l.valor))}
                </span>
                {l.status === 'PROJETADO' && (
                  <p className="text-[10px] text-amber-500">Previsto</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Widget: Despesas por Categoria ──────────────────────────────────────────

function CategoriasWidget({ categorias }: { categorias: CategoriaData[] }) {
  const total = categorias.reduce((s, c) => s + c.total, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5 pl-6">
      <div className="mb-4 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Despesas por Categoria</h2>
      </div>

      {categorias.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <PieChart className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma despesa no período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map((cat, i) => {
            const pct = total > 0 ? (cat.total / total) * 100 : 0
            return (
              <div key={i}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: cat.cor ?? '#94a3b8' }}
                    />
                    <span className="text-foreground">{cat.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.cor ?? '#94a3b8',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-64 rounded-xl bg-muted" />
      {/* Two panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-52 rounded-xl bg-muted" />
        <div className="h-52 rounded-xl bg-muted" />
      </div>
    </div>
  )
}
