'use client'
import { useTheme, type Theme } from '@/components/providers/theme-provider'

const THEMES: { id: Theme; label: string; style: React.CSSProperties }[] = [
  { id: 'light',    label: 'Claro',      style: { background: '#f0fdf4' } },
  { id: 'dark',     label: 'Escuro',     style: { background: '#1a2e1a' } },
  { id: 'midnight', label: 'Meia-noite', style: { background: '#0a0e14' } },
  { id: 'forest',   label: 'Floresta',   style: { background: 'linear-gradient(135deg, #064e3b, #0a1a0f)' } },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => setTheme(t.id)}
          className="h-[18px] w-[18px] rounded-full transition-all duration-150 hover:scale-110 focus:outline-none"
          style={{
            ...t.style,
            outline: theme === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            outlineOffset: '1px',
            transform: theme === t.id ? 'scale(1.2)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
