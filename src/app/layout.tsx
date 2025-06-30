import { type Metadata } from 'next'
import { Inter, Fira_Code } from 'next/font/google'
import './globals.css'
import TRPCProvider from './TRPCProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono", weight: "400" })


export const metadata: Metadata = {
  title: 'Vipe',
  description: 'AI-powered frontend development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${firaCode.variable} antialiased`}>
        <TRPCProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}