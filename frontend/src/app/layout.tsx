import type { Metadata } from 'next'
import './globals.css'
import { AuthInitializer } from '@/providers/AuthInitializer'

export const metadata: Metadata = {
  title: 'Text Editor RAG',
  description: 'RAG-powered Markdown Editor with GitHub Integration',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  )
}
