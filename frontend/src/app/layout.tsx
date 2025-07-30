import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "../components/AuthProvider"
import { ErrorBoundary } from "../components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NutriGenie - AI-Powered Meal Planning & Grocery Shopping",
  description:
    "Generate personalized meal plans, get real-time grocery prices, and export directly to your favorite stores with AI-powered nutrition planning.",
  keywords: "meal planning, AI nutrition, grocery shopping, diet planning, healthy eating",
  authors: [{ name: "NutriGenie Team" }],
  openGraph: {
    title: "NutriGenie - Smart Meal Planning with AI",
    description: "Transform your nutrition journey with AI-powered meal planning and smart grocery shopping.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
