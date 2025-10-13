import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
