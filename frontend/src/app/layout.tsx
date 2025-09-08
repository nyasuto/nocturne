import type { Metadata } from "next";
import "./globals.css";
import { PWAInstall } from "@/components/PWAInstall";
import { PWAProvider } from "@/components/PWAProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Nocturne - 睡眠サポートアプリ",
  description: "パーソナライズされた音楽と物語で質の高い睡眠をサポートするWebアプリケーション",
  keywords: ["睡眠", "リラックス", "音楽", "瞑想", "ウェルネス"],
  authors: [{ name: "Nocturne Team" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <PWAProvider />
        <AuthProvider>
          <SettingsProvider>
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>
              <PWAInstall />
            </div>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
