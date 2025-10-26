import type { Metadata } from 'next'
import './globals.css'
import { AuthInitializer } from '@/providers/AuthInitializer'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

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
    <html lang="ja" suppressHydrationWarning>
      {/* suppressHydrationWarningを使用してHydration警告を抑制 */}
      <body suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <AuthInitializer>{children}</AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
