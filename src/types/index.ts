export type ApiResponse<T = unknown> = {
  data?: T
  error?: string
  message?: string
}

export type TipoConta = 'CORRENTE' | 'POUPANCA' | 'DINHEIRO' | 'INVESTIMENTO' | 'OUTROS'
export type TipoCategoria = 'RECEITA' | 'DESPESA' | 'AMBOS'
export type TipoLancamento = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
export type StatusLancamento = 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO'
export type TipoSubCartao = 'FISICO' | 'VIRTUAL' | 'ADICIONAL'
export type StatusFatura = 'ABERTA' | 'FECHADA' | 'PAGA'
export type TipoMeta = 'DESPESA' | 'RECEITA'
export type StatusMetaEco = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export interface ContaDTO {
  id: string
  nome: string
  tipo: TipoConta
  banco: string | null
  moeda: string
  saldoInicial: number
  cor: string | null
  icone: string | null
  ativa: boolean
  incluirTotal: boolean
  ordem: number
  saldoAtual?: number
}

export interface CategoriaDTO {
  id: string
  nome: string
  tipo: TipoCategoria
  cor: string | null
  icone: string | null
  paiId: string | null
  ordem: number
  filhos?: CategoriaDTO[]
}

export interface LancamentoDTO {
  id: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  data: string
  categoriaId: string | null
  categoria?: { nome: string; cor: string | null }
  contaId: string | null
  conta?: { nome: string; cor: string | null }
  contaDestinoId: string | null
  status: StatusLancamento
  parcelas: number
  parcelaAtual: number
  observacao: string | null
  createdAt: string
}

export interface NavItem {
  label: string
  href: string
  icon?: string
  children?: NavItem[]
}
