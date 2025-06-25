import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriGenie - Your Personal Nutrition Assistant",
  description: "Plan your meals, track your nutrition, and achieve your health goals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={cn(inter.className, "h-full")}>
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
