
import "./globals.css"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import Background from "@/components/Background"
import { AudioProvider } from "@/components/AudioProvider"

export const metadata: Metadata = {
  title: "Odyssey Farmer • Ithaca",
  description: "Activity farmer with loop/cron, logs, balances, random ERC20/contract interactions",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AudioProvider>
          <Background />
          <Navbar />
          <main className="container py-8">{children}</main>
        </AudioProvider>
      </body>
    </html>
  )
}
