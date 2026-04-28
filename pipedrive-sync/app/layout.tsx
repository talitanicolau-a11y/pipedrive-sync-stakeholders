import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pipedrive Sync — Mudanças de Emprego',
  description: 'Automação de mudanças de emprego no Pipedrive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
