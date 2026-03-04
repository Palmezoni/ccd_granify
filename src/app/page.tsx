import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import {
  TrendingUp, CreditCard, Target, BarChart3, ArrowRight,
  CheckCircle, Wallet, Shield, Zap, Star, Menu
} from 'lucide-react'

export default async function RootPage() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-md shadow-emerald-200">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-emerald-700">Granify</span>
          </div>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#recursos" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">Recursos</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">Como funciona</a>
            <a href="#depoimentos" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition hover:text-emerald-600 sm:block">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Comece grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-20 sm:py-32">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-100 opacity-50 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-teal-100 opacity-60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <Zap className="h-3.5 w-3.5" />
            Controle financeiro de verdade
          </div>
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Seu dinheiro,{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              organizado
            </span>
            {' '}e sob controle
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Granify centraliza suas finanças: contas, cartões, metas, relatórios e fluxo de caixa — tudo em um só lugar, bonito e simples de usar.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/cadastro"
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-emerald-300"
            >
              Criar conta grátis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">Sem cartão de crédito. Grátis para começar.</p>

          {/* Dashboard preview */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-slate-400">granify.net/dashboard</span>
              </div>
            </div>
            <div className="bg-slate-50 p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Saldo total', value: 'R$ 24.850', color: 'text-emerald-600', icon: '💰' },
                  { label: 'Receitas (mês)', value: 'R$ 8.200', color: 'text-blue-600', icon: '📈' },
                  { label: 'Despesas (mês)', value: 'R$ 3.540', color: 'text-red-500', icon: '📉' },
                  { label: 'Metas ativas', value: '3 metas', color: 'text-purple-600', icon: '🎯' },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                    <div className="text-xl">{c.icon}</div>
                    <div className={`mt-2 text-lg font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-slate-500">{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Lançamentos recentes</span>
                  <span className="text-xs text-slate-400">Ver todos →</span>
                </div>
                {[
                  { desc: 'Salário', valor: '+R$ 6.500', tipo: 'RECEITA', data: 'Hoje' },
                  { desc: 'Supermercado', valor: '-R$ 312', tipo: 'DESPESA', data: 'Ontem' },
                  { desc: 'Netflix', valor: '-R$ 55', tipo: 'DESPESA', data: '02/03' },
                  { desc: 'Freelance', valor: '+R$ 1.700', tipo: 'RECEITA', data: '01/03' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between border-t border-slate-50 py-2 text-sm">
                    <span className="text-slate-700">{l.desc}</span>
                    <span className={l.tipo === 'RECEITA' ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>{l.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-100 bg-slate-50 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="mb-4 text-sm font-medium text-slate-500">Junte-se a quem já controla melhor suas finanças</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-1.5 text-sm"><CheckCircle className="h-4 w-4 text-emerald-500" /> Seguro e privado</div>
            <div className="flex items-center gap-1.5 text-sm"><CheckCircle className="h-4 w-4 text-emerald-500" /> Multi-banco</div>
            <div className="flex items-center gap-1.5 text-sm"><CheckCircle className="h-4 w-4 text-emerald-500" /> Relatórios PDF e Excel</div>
            <div className="flex items-center gap-1.5 text-sm"><CheckCircle className="h-4 w-4 text-emerald-500" /> Metas de poupança</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black text-slate-900">Tudo que você precisa,<br/>em um só lugar</h2>
            <p className="mt-4 text-slate-600">Recursos completos para quem leva as finanças a sério</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Wallet className="h-6 w-6" />,
                color: 'bg-emerald-100 text-emerald-600',
                title: 'Múltiplas Contas',
                desc: 'Gerencie contas corrente, poupança, dinheiro em espécie e investimentos com saldo atualizado em tempo real.',
              },
              {
                icon: <CreditCard className="h-6 w-6" />,
                color: 'bg-blue-100 text-blue-600',
                title: 'Cartões de Crédito',
                desc: 'Controle faturas, feche e pague cartões de crédito com visualização clara do limite utilizado.',
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                color: 'bg-violet-100 text-violet-600',
                title: 'Fluxo de Caixa',
                desc: 'Visualize receitas vs. despesas por mês com gráficos interativos e saldo acumulado.',
              },
              {
                icon: <Target className="h-6 w-6" />,
                color: 'bg-rose-100 text-rose-600',
                title: 'Metas Financeiras',
                desc: 'Defina orçamentos por categoria e metas de poupança com acompanhamento de progresso.',
              },
              {
                icon: <Zap className="h-6 w-6" />,
                color: 'bg-amber-100 text-amber-600',
                title: 'Regras Automáticas',
                desc: 'Configure regras para categorizar lançamentos automaticamente com base na descrição.',
              },
              {
                icon: <Shield className="h-6 w-6" />,
                color: 'bg-teal-100 text-teal-600',
                title: 'Relatórios & Export',
                desc: 'Exporte relatórios completos em PDF e Excel com extrato detalhado de cada conta.',
              },
            ].map(f => (
              <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.color}`}>{f.icon}</div>
                <h3 className="mb-2 font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black text-slate-900">Comece em minutos</h2>
            <p className="mt-4 text-slate-600">Sem burocracia, sem complicação</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { n: '01', title: 'Crie sua conta', desc: 'Cadastro simples com e-mail e senha. Em segundos você já tem acesso à plataforma.' },
              { n: '02', title: 'Adicione suas contas', desc: 'Cadastre suas contas bancárias, carteiras e cartões de crédito com seus saldos.' },
              { n: '03', title: 'Lance e acompanhe', desc: 'Registre receitas, despesas e transferências. Veja seu dinheiro crescer com metas.' },
            ].map(s => (
              <div key={s.n} className="relative rounded-2xl bg-white p-8 shadow-sm">
                <div className="mb-4 text-5xl font-black text-emerald-100">{s.n}</div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black text-slate-900">O que dizem nossos usuários</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                nome: 'Ana Souza', cargo: 'Empreendedora',
                texto: 'Finalmente um app de finanças que é bonito e funcional. Consigo ver exatamente onde meu dinheiro vai todos os meses.',
              },
              {
                nome: 'Carlos Mendes', cargo: 'Analista de TI',
                texto: 'As regras automáticas poupam muito tempo. Não preciso categorizar cada lançamento manualmente. Simplesmente fantástico!',
              },
              {
                nome: 'Marina Costa', cargo: 'Professora',
                texto: 'Comecei a economizar de verdade depois de usar o Granify. As metas de poupança me mantêm motivada. Recomendo!',
              },
            ].map(t => (
              <div key={t.nome} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">"{t.texto}"</p>
                <div>
                  <div className="font-semibold text-slate-900">{t.nome}</div>
                  <div className="text-xs text-slate-500">{t.cargo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">Pronto para ter controle total?</h2>
          <p className="mb-8 text-emerald-100">Crie sua conta agora e transforme sua relação com o dinheiro.</p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-base font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
          >
            Criar conta grátis <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-emerald-200">Sem cartão de crédito. Acesso imediato.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-emerald-700">Granify</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/login" className="hover:text-emerald-600">Entrar</Link>
              <Link href="/cadastro" className="hover:text-emerald-600">Cadastrar</Link>
              <a href="mailto:suporte@granify.net" className="hover:text-emerald-600">Suporte</a>
              <a href="mailto:contato@granify.net" className="hover:text-emerald-600">Contato</a>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Granify. Todos os direitos reservados. · granify.net
          </div>
        </div>
      </footer>
    </div>
  )
}
