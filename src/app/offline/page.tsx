'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6">
        <svg className="h-8 w-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Voce esta offline</h1>
      <p className="text-muted-foreground mb-6">Verifique sua conexao com a internet e tente novamente.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Tentar novamente
      </button>
    </div>
  )
}
