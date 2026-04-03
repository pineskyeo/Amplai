import type { Metadata, Viewport } from 'next'
import './globals.css'
import PwaRegister from './pwa-register'
import BenchmarkIndicator from '@/components/ui/benchmark-indicator'

export const metadata: Metadata = {
  title: 'Amplai — Harness Engineering',
  description:
    'AI Harness Engineering Platform — Structural Convergence Benchmark',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Amplai',
  },
}

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body>
        <PwaRegister />
        {children}
        <BenchmarkIndicator />
      </body>
    </html>
  )
}
