'use client'

import { useShortcuts, ALL_SHORTCUTS } from '@/components/providers/shortcuts-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { useState } from 'react'
import {
  Wallet, PlusCircle, FileText, CreditCard, Target, BarChart3
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Wallet:     <Wallet className="h-5 w-5" />,
  PlusCircle: <PlusCircle className="h-5 w-5" />,
  FileText:   <FileText className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  Target:     <Target className="h-5 w-5" />,
  BarChart3:  <BarChart3 className="h-5 w-5" />,
}

export default function AtalhoPage() {
  const { enabled, setEnabled } = useShortcuts()
  const { t } = useLanguage()
  const [saved, setSaved] = useState(false)

  function toggle(id: string) {
    if (enabled.includes(id)) {
      setEnabled(enabled.filter((e) => e !== id))
    } else if (enabled.length < 5) {
      setEnabled([...enabled, id])
    }
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">{t('atalhos.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('atalhos.desc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL_SHORTCUTS.map((s) => {
          const isEnabled = enabled.includes(s.id)
          const canEnable = enabled.length < 5 || isEnabled

          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              disabled={!canEnable}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isEnabled
                  ? 'border-primary bg-primary/10 text-primary'
                  : canEnable
                  ? 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent'
                  : 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50'
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${isEnabled ? 'bg-primary/20' : 'bg-secondary'}`}>
                {ICON_MAP[s.icon]}
              </div>
              <div>
                <p className="font-medium">{t(s.labelKey as any)}</p>
                <p className="text-xs text-muted-foreground">{s.href}</p>
              </div>
              <div className="ml-auto">
                <div className={`h-5 w-5 rounded-full border-2 transition-all ${isEnabled ? 'border-primary bg-primary' : 'border-border'}`}>
                  {isEnabled && (
                    <svg viewBox="0 0 20 20" fill="white" className="h-4 w-4">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {enabled.length}/5 {t('atalhos.desc').split('(')[1]?.replace(')', '') || 'atalhos selecionados'}
      </p>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {saved ? `✓ ${t('atalhos.saved')}` : t('atalhos.save')}
        </button>
      </div>
    </div>
  )
}
