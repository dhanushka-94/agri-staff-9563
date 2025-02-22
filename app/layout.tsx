import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RootLayoutContent } from "@/components/root-layout-content";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agri Staff Directory Control Panel",
  description: "Staff Directory Management System for Department of Agriculture, Sri Lanka",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <DynamicFavicon />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <RootLayoutContent>{children}</RootLayoutContent>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
